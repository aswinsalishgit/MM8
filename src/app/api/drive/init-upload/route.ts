import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { filename, mimeType } = body;

    if (!filename || !mimeType) {
      return NextResponse.json({ error: 'Filename and mimeType are required' }, { status: 400 });
    }

    // Fetch user profile for Drive folder ID and audition count
    const { data: profile } = await supabase
      .from('profiles')
      .select('drive_folder_id, audition_count')
      .eq('id', user.id)
      .single();

    if (!profile?.drive_folder_id) {
      return NextResponse.json({ error: 'Drive folder not initialized' }, { status: 400 });
    }

    const newCount = (profile.audition_count || 0) + 1;
    const driveFileName = `Audition Tape - ${newCount}`;

    // Initialize OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN?.replace(/"/g, ''),
    });

    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error("Failed to authenticate with Google");

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const metadata = {
      name: driveFileName,
      parents: [profile.drive_folder_id],
    };

    // Request Resumable Upload Session URL
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': mimeType,
          'Origin': origin,
        },
        body: JSON.stringify(metadata),
      }
    );

    const uploadUrl = response.headers.get('Location');
    if (!uploadUrl) throw new Error(`Google rejected session: ${response.status}`);

    // Increment audition count in DB
    await supabase
      .from('profiles')
      .update({ audition_count: newCount })
      .eq('id', user.id);

    return NextResponse.json({ uploadUrl });
  } catch (error: any) {
    console.error('MM8_DRIVE_INIT_FAILURE:', error.message || error);
    return NextResponse.json({ 
      error: 'Upload Initialization Failure', 
      details: error.message 
    }, { status: 500 });
  }
}
