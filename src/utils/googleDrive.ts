import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN?.replace(/"/g, ''),
});

async function getDriveClient() {
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function createUserFolder(fullName: string, email: string, userId: string) {
  const drive = await getDriveClient();
  const folderName = `${fullName} (${email}, ${userId})`;
  
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!] // Use the root folder ID from env
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink',
    });
    
    // Make folder accessible to anyone with the link
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return { id: file.data.id, link: file.data.webViewLink };
  } catch (err) {
    console.error('MM8_DRIVE_FOLDER_ERROR:', err);
    throw err;
  }
}

export async function uploadToDrive(folderId: string, fileName: string, fileBuffer: Buffer, mimeType: string) {
  const drive = await getDriveClient();
  
  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };
  
  const media = {
    mimeType: mimeType,
    body: require('stream').Readable.from(fileBuffer)
  };

  try {
    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webContentLink, webViewLink',
    });

    // Make individual file public for dashboard viewing
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    return file.data;
  } catch (err) {
    console.error('MM8_DRIVE_UPLOAD_ERROR:', err);
    throw err;
  }
}
