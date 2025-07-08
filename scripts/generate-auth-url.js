#!/usr/bin/env node

import readline from 'readline';
import { URLSearchParams } from 'url';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function generateAuthUrl() {
  console.log('🔧 Constant Contact Authorization URL Generator');
  console.log('==============================================\n');

  const apiKey = await question('Enter your Constant Contact API Key: ');
  const redirectUri = await question('Enter your redirect URI (must match app settings): ');
  
  console.log('\n📋 Configuration:');
  console.log(`API Key: ${apiKey}`);
  console.log(`Redirect URI: ${redirectUri}\n`);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: apiKey,
    redirect_uri: redirectUri,
    scope: 'contact_data offline_access',
    state: 'nw_dems_app_' + Date.now()
  });
  
  const authUrl = `https://authz.constantcontact.com/oauth2/default/v1/authorize?${params.toString()}`;
  
  console.log('🌐 Authorization URL:');
  console.log('====================');
  console.log(authUrl);
  console.log('\n📝 Instructions:');
  console.log('1. Copy and paste this URL into your browser');
  console.log('2. Log in to Constant Contact and authorize the application');
  console.log('3. You will be redirected to your redirect URI with a "code" parameter');
  console.log('4. Copy the entire redirect URL and use it with the setup script');
  
  rl.close();
}

generateAuthUrl().catch(console.error); 