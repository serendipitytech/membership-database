// This script uses the redirect URI from your .env.nwclub file (VITE_CONSTANT_CONTACT_REDIRECT_URI)
// so you can easily switch between local and production OAuth flows. The redirect URI must match
// one of the URIs registered in your Constant Contact app settings, or the OAuth flow will fail.
//
// Example .env.nwclub:
// VITE_CONSTANT_CONTACT_API_KEY=...
// VITE_CONSTANT_CONTACT_CLIENT_SECRET=...
// VITE_CONSTANT_CONTACT_REDIRECT_URI=https://nwdems.vercel.app

import readline from 'readline';
import open from 'open';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

const envPath = path.join(process.cwd(), '.env.nwclub');
dotenv.config({ path: envPath });

const API_KEY = process.env.VITE_CONSTANT_CONTACT_API_KEY;
const CLIENT_SECRET = process.env.VITE_CONSTANT_CONTACT_CLIENT_SECRET;
const REDIRECT_URI = process.env.VITE_CONSTANT_CONTACT_REDIRECT_URI || 'http://localhost:5173/oauth/callback';

const AUTH_URL = 'https://authz.constantcontact.com/oauth2/default/v1/authorize';
const TOKEN_URL = 'https://authz.constantcontact.com/oauth2/default/v1/token';

const SCOPES = [
  'contact_data',
  'campaign_data',
  'offline_access'
].join(' ');

function prompt(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  if (!API_KEY || !CLIENT_SECRET) {
    console.error('Missing API key or client secret in .env.nwclub');
    process.exit(1);
  }

  // 1. Generate the authorization URL
  const state = Math.random().toString(36).substring(2, 15);
  const url = `${AUTH_URL}?response_type=code&client_id=${encodeURIComponent(API_KEY)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&state=${state}&prompt=consent`;

  console.log('\nOpen this URL in your browser and authorize the app:');
  console.log(url);
  await open(url);

  // 2. Get the code from the user
  const code = await prompt('\nPaste the code from the redirect URL (?code=...): ');

  // 3. Exchange code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${API_KEY}:${CLIENT_SECRET}`).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('Token exchange failed:', tokenData);
    process.exit(1);
  }

  console.log('\nSuccess! Here are your tokens:');
  console.log(tokenData);

  if (tokenData.refresh_token) {
    console.log('\nAdd this to your .env.nwclub:');
    console.log(`VITE_CONSTANT_CONTACT_REFRESH_TOKEN=${tokenData.refresh_token}`);
  } else {
    console.error('No refresh token received!');
  }
}

main(); 