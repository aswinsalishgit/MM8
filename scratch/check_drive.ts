
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function diagnose() {
  console.log("--- MM8 DRIVE DIAGNOSTICS ---");
  
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const refresh_token = process.env.GOOGLE_REFRESH_TOKEN?.replace(/"/g, '');

  if (!client_id || !client_secret || !refresh_token) {
    console.error("MISSING CREDENTIALS IN .env.local");
    console.log("CLIENT_ID:", !!client_id);
    console.log("CLIENT_SECRET:", !!client_secret);
    console.log("REFRESH_TOKEN:", !!refresh_token);
    return;
  }

  const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
  oauth2Client.setCredentials({ refresh_token });

  try {
    console.log("Attempting to refresh access token...");
    const { token } = await oauth2Client.getAccessToken();
    console.log("SUCCESS! Access token acquired:", token?.substring(0, 10) + "...");
  } catch (err: any) {
    console.error("\n❌ DIAGNOSTIC FAILURE: invalid_grant");
    console.error("The Google Drive Refresh Token is no longer valid.");
    console.error("\nPOSSIBLE REASONS:");
    console.error("1. 7-Day Expiration: Your Google Cloud project is likely in 'Testing' mode. Tokens expire every 7 days in this mode.");
    console.error("2. Password Change: If you recently changed your Google account password, all refresh tokens are revoked.");
    console.error("3. Revoked Access: You may have removed the app's permissions in your Google Security settings.");
    
    console.log("\nACTION REQUIRED:");
    console.log("Please re-generate your GOOGLE_REFRESH_TOKEN and update your .env.local file.");
  }
}

diagnose();
