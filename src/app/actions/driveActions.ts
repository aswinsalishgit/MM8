"use server";

import { createUserFolder, uploadToDrive, deleteFile, findFilesByName } from "@/utils/googleDrive";
import { createClient } from "@/utils/supabase/server";

export async function ensureUserFolder() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if folder already exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_drive, drive_folder_id, full_name, email, role')
    .eq('id', user.id)
    .single();

  if (profile?.drive_folder_id && profile.user_drive !== 'NONE') {
    return { id: profile.drive_folder_id, link: profile.user_drive };
  }

  const fullName = profile?.full_name || user.user_metadata.full_name || user.email?.split('@')[0] || "User";
  const email = user.email || "no-email";
  
  const driveInfo = await createUserFolder(fullName, email, user.id, profile?.role || 'ACTOR');
  
  await supabase
    .from('profiles')
    .update({ 
      user_drive: driveInfo.link,
      drive_folder_id: driveInfo.id 
    })
    .eq('id', user.id);

  return { id: driveInfo.id, link: driveInfo.link };
}

export async function uploadProfilePicture(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get('file') as File;
  const fullName = formData.get('fullName') as string;
  if (!file) throw new Error("No file provided");

  const { data: profile } = await supabase
    .from('profiles')
    .select('drive_folder_id, full_name')
    .eq('id', user.id)
    .single();

  let driveFolderId = profile?.drive_folder_id;
  if (!driveFolderId) {
    const driveInfo = await ensureUserFolder();
    driveFolderId = driveInfo.id;
  }
  
  if (!driveFolderId) throw new Error("Drive folder initialization failed");

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `PFP - ${fullName || profile?.full_name || 'User'}`;
  
  // Cleanup old PFPs before uploading new one
  try {
    const existingFiles = await findFilesByName(driveFolderId, fileName);
    for (const f of existingFiles) {
      if (f.id) await deleteFile(f.id);
    }
  } catch (e) {
    console.error("MM8_CLEANUP_STALE_PFP_FAILURE:", e);
  }

  const driveFile = await uploadToDrive(driveFolderId, fileName, buffer, file.type);
  const proxyUrl = `/api/drive/stream/${driveFile.id}`;
  
  await supabase
    .from('profiles')
    .update({ avatar_url_proxy: proxyUrl })
    .eq('id', user.id);

  return proxyUrl;
}

export async function removeProfilePicture() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from('profiles')
    .select('drive_folder_id, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.drive_folder_id) {
    const fileName = `PFP - ${profile.full_name || 'User'}`;
    const existingFiles = await findFilesByName(profile.drive_folder_id, fileName);
    for (const f of existingFiles) {
      if (f.id) await deleteFile(f.id);
    }
  }

  await supabase
    .from('profiles')
    .update({ avatar_url_proxy: null, user_drive: 'NONE' })
    .eq('id', user.id);

  return true;
}

export async function uploadAuditionTape(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const file = formData.get('file') as File;
  if (!file) throw new Error("No file provided");

  const { data: profile } = await supabase
    .from('profiles')
    .select('drive_folder_id, audition_count')
    .eq('id', user.id)
    .single();

  let driveFolderId = profile?.drive_folder_id;
  if (!driveFolderId) {
    const driveInfo = await ensureUserFolder();
    driveFolderId = driveInfo.id;
  }

  if (!driveFolderId) throw new Error("Drive folder initialization failed");

  const newCount = (profile?.audition_count || 0) + 1;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `Audition Tape - ${newCount}`;
  
  const driveFile = await uploadToDrive(driveFolderId, fileName, buffer, file.type);
  
  await supabase
    .from('profiles')
    .update({ audition_count: newCount })
    .eq('id', user.id);

  return driveFile.webViewLink || null;
}
