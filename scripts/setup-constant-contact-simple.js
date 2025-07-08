#!/usr/bin/env node

import readline from 'readline';
import fetch from 'node-fetch';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SimpleConstantContactSetup {
  constructor() {
    this.apiKey = '';
    this.clientSecret = '';
    this.redirectUri = '';
  }

  async question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
  }

  async start() {
    console.log('🔧 Constant Contact OAuth2 Setup (Simple)');
    console.log('=========================================\n');

    // Get API credentials
    this.apiKey = await this.question('Enter your Constant Contact API Key: ');
    this.clientSecret = await this.question('Enter your Constant Contact Client Secret: ');
    this.redirectUri = await this.question('Enter your redirect URI (from app settings): ');
    
    console.log('\n📋 Setup Information:');
    console.log(`API Key: ${this.apiKey}`);
    console.log(`Client Secret: ${this.clientSecret}`);
    console.log(`Redirect URI: ${this.redirectUri}\n`);

    // Create authorization URL
    const authUrl = this.createAuthUrl();
    
    console.log('🌐 Step 1: Authorization');
    console.log('------------------------');
    console.log('1. Visit this URL in your browser:');
    console.log(`   ${authUrl}\n`);
    console.log('2. Log in to Constant Contact and authorize the application');
    console.log('3. You will be redirected to your redirect URI with an authorization code');
    console.log('4. Copy the "code" parameter from the URL\n');

    // Wait for authorization code
    const authCode = await this.question('Enter the authorization code from the redirect URL: ');
    
    // Exchange code for tokens
    console.log('\n🔄 Step 2: Exchanging Code for Tokens');
    console.log('--------------------------------------');
    const tokens = await this.exchangeCodeForTokens(authCode);
    
    // Display results
    console.log('\n✅ Setup Complete!');
    console.log('==================');
    console.log('\nAdd these environment variables to your .env file:');
    console.log(`VITE_CONSTANT_CONTACT_API_KEY=${this.apiKey}`);
    console.log(`VITE_CONSTANT_CONTACT_CLIENT_SECRET=${this.clientSecret}`);
    console.log(`VITE_CONSTANT_CONTACT_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('VITE_CONSTANT_CONTACT_LIST_ID=your_list_id_here');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Get your List ID from Constant Contact (Contacts > Lists > Select List > Copy ID from URL)');
    console.log('2. Add the List ID to your .env file');
    console.log('3. Deploy your application');
    console.log('4. Test the integration at /admin/constant-contact');
    
    rl.close();
    process.exit(0);
  }

  createAuthUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.apiKey,
      redirect_uri: this.redirectUri,
      scope: 'contact_data offline_access',
      state: 'nw_dems_app_' + Date.now()
    });
    
    return `https://authz.constantcontact.com/oauth2/default/v1/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(authCode) {
    try {
      const credentials = Buffer.from(`${this.apiKey}:${this.clientSecret}`).toString('base64');
      
      const response = await fetch('https://authz.constantcontact.com/oauth2/default/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: this.redirectUri,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const tokenData = await response.json();
      
      console.log('✅ Token exchange successful!');
      console.log(`   Access Token: ${tokenData.access_token.substring(0, 20)}...`);
      console.log(`   Refresh Token: ${tokenData.refresh_token.substring(0, 20)}...`);
      console.log(`   Expires In: ${tokenData.expires_in} seconds`);
      
      return tokenData;
    } catch (error) {
      console.error('❌ Error exchanging code for tokens:', error.message);
      throw error;
    }
  }
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Start the setup
const setup = new SimpleConstantContactSetup();
setup.start().catch((error) => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}); 