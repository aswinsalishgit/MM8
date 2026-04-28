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
    .select('user_drive, full_name, email')
    .eq('id', user.id)
    .single();

  if (profile?.user_drive && profile.user_drive !== 'NONE') {
    return profile.user_drive;
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

  return driveInfo.link;
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

  if (!profile?.drive_folder_id) throw new Error("Drive folder not initialized");

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `PFP - ${fullName || profile.full_name || 'User'}`;
  
  const driveFile = await uploadToDrive(profile.drive_folder_id, fileName, buffer, file.type);
  
  // Update avatar link to a more reliable direct link format
  const reliableUrl = `https://lh3.googleusercontent.com/d/${driveFile.id}`;
  await supabase
    .from('profiles')
    .update({ avatar_url_proxy: reliableUrl })
    .eq('id', user.id);

  return reliableUrl;
}

export async function getAuditionVideos() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from('profiles')
    .select('drive_folder_id')
    .eq('id', user.id)
    .single();

  if (!profile?.drive_folder_id) return [];

  const { google } = await import('googleapis');
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN?.replace(/"/g, ''),
  });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.list({
    q: `'${profile.drive_folder_id}' in parents and (mimeType contains 'video/' or name contains 'Audition Tape')`,
    fields: 'files(id, name, webViewLink, webContentLink, thumbnailLink)',
    orderBy: 'createdTime desc'
  });

  return response.data.files || [];
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

  if (!profile?.drive_folder_id) throw new Error("Drive folder not initialized");

  const newCount = (profile.audition_count || 0) + 1;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `Audition Tape - ${newCount}`;
  
  const driveFile = await uploadToDrive(profile.drive_folder_id, fileName, buffer, file.type);
  
  await supabase
    .from('profiles')
    .update({ audition_count: newCount })
    .eq('id', user.id);

  return driveFile.webViewLink || null;
}
