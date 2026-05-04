import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN?.replace(/['"]/g, '').trim(),
});

async function getDriveClient() {
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function ensureRoleFolder(role: 'ACTOR' | 'DIRECTOR' | string) {
  const drive = await getDriveClient();
  const rootId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const folderName = role === 'DIRECTOR' ? 'DIRECTORS' : 'ACTORS';
  
  // Find if exists
  const response = await drive.files.list({
    q: `'${rootId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
  });
  
  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }
  
  // Create if not exists
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [rootId]
  };
  
  const file = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });
  
  return file.data.id;
}

export async function createUserFolder(fullName: string, email: string, userId: string, role: string) {
  const drive = await getDriveClient();
  const folderName = `${fullName} (${email}, ${userId})`;
  
  const parentId = await ensureRoleFolder(role);
  
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId!]
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
export async function deleteFile(fileId: string) {
  const drive = await getDriveClient();
  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (err) {
    console.error('MM8_DRIVE_DELETE_ERROR:', err);
    return false;
  }
}

export async function findFilesByName(folderId: string, name: string) {
  const drive = await getDriveClient();
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and name = '${name}' and trashed = false`,
      fields: 'files(id, name)',
    });
    return response.data.files || [];
  } catch (err) {
    console.error('MM8_DRIVE_FIND_ERROR:', err);
    return [];
  }
}

export async function getFileStream(fileId: string) {
  console.log('MM8_DRIVE_GET_STREAM:', fileId);
  const drive = await getDriveClient();
  try {
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return response.data;
  } catch (err) {
    console.error('MM8_DRIVE_STREAM_ERROR:', err);
    throw err;
  }
}

export async function getFileMetadata(fileId: string) {
  console.log('MM8_DRIVE_GET_METADATA:', fileId);
  const drive = await getDriveClient();
  try {
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size',
    });
    return response.data;
  } catch (err) {
    console.error('MM8_DRIVE_METADATA_ERROR:', err);
    throw err;
  }
}
