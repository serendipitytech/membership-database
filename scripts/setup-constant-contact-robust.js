#!/usr/bin/env node

import readline from 'readline';
import fetch from 'node-fetch';
import crypto from 'crypto';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class RobustConstantContactSetup {
  constructor() {
    this.apiKey = '';
    this.clientSecret = '';
    this.redirectUri = '';
    this.state = '';
  }

  async question(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
  }

  generateState() {
    return 'nw_dems_' + crypto.randomBytes(16).toString('hex');
  }

  async start() {
    console.log('🔧 Constant Contact OAuth2 Setup (Robust)');
    console.log('=========================================\n');

    // Get API credentials
    this.apiKey = await this.question('Enter your Constant Contact API Key: ');
    this.clientSecret = await this.question('Enter your Constant Contact Client Secret: ');
    this.redirectUri = await this.question('Enter your redirect URI (from app settings): ');
    
    // Generate a secure state parameter
    this.state = this.generateState();
    
    console.log('\n📋 Setup Information:');
    console.log(`API Key: ${this.apiKey}`);
    console.log(`Client Secret: ${this.clientSecret}`);
    console.log(`Redirect URI: ${this.redirectUri}`);
    console.log(`State: ${this.state}\n`);

    // Create authorization URL
    const authUrl = this.createAuthUrl();
    
    console.log('🌐 Step 1: Authorization');
    console.log('------------------------');
    console.log('1. Visit this URL in your browser:');
    console.log(`   ${authUrl}\n`);
    console.log('2. Log in to Constant Contact and authorize the application');
    console.log('3. You will be redirected to your redirect URI with authorization parameters');
    console.log('4. Copy the ENTIRE redirect URL (including all parameters)\n');

    // Wait for redirect URL
    const redirectUrl = await this.question('Enter the complete redirect URL: ');
    
    // Parse the redirect URL
    const authCode = this.parseRedirectUrl(redirectUrl);
    
    if (!authCode) {
      console.error('❌ Could not extract authorization code from redirect URL');
      console.log('Make sure you copied the entire URL including the "code" parameter');
      rl.close();
      process.exit(1);
    }
    
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
      state: this.state
    });
    
    return `https://authz.constantcontact.com/oauth2/default/v1/authorize?${params.toString()}`;
  }

  parseRedirectUrl(redirectUrl) {
    try {
      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      
      if (error) {
        console.error(`❌ Authorization error: ${error}`);
        if (errorDescription) {
          console.error(`   Description: ${errorDescription}`);
        }
        return null;
      }
      
      if (!code) {
        console.error('❌ No authorization code found in redirect URL');
        return null;
      }
      
      if (state !== this.state) {
        console.error('❌ State parameter mismatch. This could indicate a security issue.');
        return null;
      }
      
      console.log('✅ Authorization code extracted successfully');
      return code;
    } catch (error) {
      console.error('❌ Invalid redirect URL format');
      return null;
    }
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
const setup = new RobustConstantContactSetup();
setup.start().catch((error) => {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}); 