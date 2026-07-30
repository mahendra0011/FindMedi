import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:5001/api/drive/callback';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

function isConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

function getAuthUrl() {
  if (!isConfigured()) {
    throw new Error('Google Drive is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
  }
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

async function exchangeCodeForTokens(code) {
  if (!isConfigured()) {
    throw new Error('Google Drive is not configured.');
  }
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function createUserClient(tokens) {
  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  client.setCredentials(tokens);
  return client;
}

async function getValidAccessToken(tokens) {
  const client = createUserClient(tokens);
  const result = await client.getAccessToken();
  return result.token;
}

async function getOrCreateMedicoreFolder(accessToken) {
  const query = encodeURIComponent("name='Medicore' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const searchData = await searchRes.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Medicore',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const createData = await createRes.json();
  return createData.id;
}

async function uploadFileToDrive(tokens, fileBuffer, filename, mimeType) {
  if (!isConfigured()) {
    throw new Error('Google Drive is not configured.');
  }

  const accessToken = await getValidAccessToken(tokens);
  const folderId = await getOrCreateMedicoreFolder(accessToken);

  const boundary = `medicore_${Date.now()}`;
  const metadata = {
    name: `Medicore_${filename}`,
    parents: [folderId],
  };

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(JSON.stringify(metadata) + '\r\n'),
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const uploadRes = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': body.length.toString(),
      },
      body,
    }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Drive upload failed: ${uploadRes.status} ${errorText}`);
  }

  const result = await uploadRes.json();

  const fileRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${result.id}?fields=id,name,size,webViewLink,webContentLink,mimeType`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const fileData = await fileRes.json();

  return {
    fileId: result.id,
    filename: fileData.name,
    url: fileData.webViewLink,
    webContentLink: fileData.webContentLink,
    size: parseInt(fileData.size, 10) || fileBuffer.length,
    format: mimeType.split('/')[1] || '',
    mimeType,
    storedIn: 'drive',
  };
}

export {
  isConfigured,
  getAuthUrl,
  exchangeCodeForTokens,
  uploadFileToDrive,
};
