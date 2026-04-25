import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, mimeType } = body;

    if (!filename || !mimeType) {
      return NextResponse.json({ error: 'Filename and mimeType are required' }, { status: 400 });
    }

    // 1. Initialize OAuth2 client with your Admin credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // 2. Set the Refresh Token to allow long-term impersonation
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN?.replace(/"/g, ''),
    });

    // 3. Obtain a fresh Access Token for this upload session
    const { token } = await oauth2Client.getAccessToken();

    if (!token) {
      throw new Error("Failed to authenticate with Google Refresh Token. Check credentials.");
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const metadata = {
      name: filename,
      parents: folderId ? [folderId] : [],
    };

    // 4. Request the Resumable Upload Session URL from Google Drive API
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': mimeType,
          'Origin': origin, // Critical for CORS during the client-side PUT
        },
        body: JSON.stringify(metadata),
      }
    );

    const uploadUrl = response.headers.get('Location');

    if (!uploadUrl) {
      const errorText = await response.text();
      console.error("Google Drive Handshake Error:", errorText);
      throw new Error(`Google rejected session initiation: ${response.status}`);
    }

    // 5. Return the secure session URI to the client for direct upload
    return NextResponse.json({ uploadUrl });
  } catch (error: any) {
    console.error('MM8_DRIVE_INIT_FAILURE:', error.message || error);
    return NextResponse.json({ 
      error: 'Authentication or Handshake Failure', 
      details: error.message 
    }, { status: 500 });
  }
}
