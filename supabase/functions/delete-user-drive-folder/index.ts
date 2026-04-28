import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const GOOGLE_CLIENT_EMAIL = Deno.env.get('GOOGLE_CLIENT_EMAIL')
const GOOGLE_PRIVATE_KEY = Deno.env.get('GOOGLE_PRIVATE_KEY')
const ROOT_FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')

serve(async (req) => {
  console.log("MM8_SYSTEM: Archive trigger received")
  
  try {
    const payload = await req.json()
    const driveFolderId = payload.old_record?.drive_folder_id

    if (!driveFolderId || driveFolderId === 'NONE') {
      return new Response(JSON.stringify({ message: 'Skipped: No Folder ID' }), { status: 200 })
    }

    const token = await getGoogleAccessToken()

    // 1. Find the "Trash" folder inside the Root Auditions folder
    console.log(`MM8_SYSTEM: Searching for 'Trash' folder in ${ROOT_FOLDER_ID}`)
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q='${ROOT_FOLDER_ID}' in parents and name='Trash' and mimeType='application/vnd.google-apps.folder' and trashed=false`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const searchData = await searchRes.json()
    const trashFolderId = searchData.files?.[0]?.id

    if (!trashFolderId) {
      throw new Error("Could not find a folder named 'Trash' inside the root auditions folder.")
    }

    // 2. Get current parents of the user's folder to remove them
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFolderId}?fields=parents`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const fileData = await fileRes.json()
    const previousParents = fileData.parents?.join(',') || ''

    // 3. Move the folder by updating parents
    console.log(`MM8_SYSTEM: Moving ${driveFolderId} to archive folder ${trashFolderId}`)
    const moveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFolderId}?addParents=${trashFolderId}&removeParents=${previousParents}&supportsAllDrives=true`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!moveRes.ok) {
      const error = await moveRes.text()
      throw new Error(`Move Failed (${moveRes.status}): ${error}`)
    }

    console.log(`MM8_SYSTEM: Successfully archived folder ${driveFolderId}`)
    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (error) {
    console.error('MM8_SYSTEM_ERROR:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

async function getGoogleAccessToken() {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error('Credentials missing')
  }

  const cleanKey = GOOGLE_PRIVATE_KEY
    .replace(/\\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('---'))
    .join('')
    .replace(/\s/g, '')

  const binaryDer = decode(cleanKey)
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["sign"]
  )

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: GOOGLE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp: getNumericDate(3600),
      iat: getNumericDate(0),
    },
    cryptoKey
  )

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })

  const data = await response.json()
  if (!data.access_token) throw new Error('Token failed')
  return data.access_token
}
