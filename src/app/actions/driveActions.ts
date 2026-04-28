"use server";

import { createUserFolder, uploadToDrive } from "@/utils/googleDrive";
import { createClient } from "@/utils/supabase/server";

export async function ensureUserFolder() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if folder already exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_drive, drive_folder_id, full_name, email')
    .eq('id', user.id)
    .single();

  if (profile?.drive_folder_id && profile.user_drive !== 'NONE') {
    return { id: profile.drive_folder_id, link: profile.user_drive };
  }

  const fullName = profile?.full_name || user.user_metadata.full_name || user.email?.split('@')[0] || "User";
  const email = user.email || "no-email";
  
  const driveInfo = await createUserFolder(fullName, email, user.id);
  
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
  
  const driveFile = await uploadToDrive(driveFolderId, fileName, buffer, file.type);
  
  await supabase
    .from('profiles')
    .update({ avatar_url_proxy: driveFile.webContentLink })
    .eq('id', user.id);

  return driveFile.webContentLink || null;
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
