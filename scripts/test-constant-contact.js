#!/usr/bin/env node

import fetch from 'node-fetch';

async function testConnection() {
  console.log('🔧 Testing Constant Contact Connection');
  console.log('=====================================\n');

  try {
    // Test token refresh first
    console.log('1. Testing token refresh...');
    const tokenUrl = 'https://authz.constantcontact.com/oauth2/default/v1/token';
    
    // You'll need to provide these values
    const apiKey = process.env.VITE_CONSTANT_CONTACT_API_KEY;
    const clientSecret = process.env.VITE_CONSTANT_CONTACT_CLIENT_SECRET;
    const refreshToken = process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN;
    
    if (!apiKey || !clientSecret || !refreshToken) {
      console.error('❌ Missing environment variables:');
      console.error('   VITE_CONSTANT_CONTACT_API_KEY:', apiKey ? '✓' : '✗');
      console.error('   VITE_CONSTANT_CONTACT_CLIENT_SECRET:', clientSecret ? '✓' : '✗');
      console.error('   VITE_CONSTANT_CONTACT_REFRESH_TOKEN:', refreshToken ? '✓' : '✗');
      return;
    }

    const credentials = Buffer.from(`${apiKey}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token refresh failed:', tokenResponse.status, tokenResponse.statusText);
      console.error('   Error details:', errorText);
      return;
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token refresh successful!');
    console.log(`   Access Token: ${tokenData.access_token.substring(0, 20)}...`);
    console.log(`   Expires In: ${tokenData.expires_in} seconds`);

    // Test API connection
    console.log('\n2. Testing API connection...');
    
    try {
      const listId = process.env.VITE_CONSTANT_CONTACT_LIST_ID;
      if (!listId) {
        console.error('❌ Missing VITE_CONSTANT_CONTACT_LIST_ID environment variable');
        return;
      }

      const apiUrl = `https://api.cc.email/v3/contact_lists/${listId}/contacts?limit=50`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API connection failed:', response.status, response.statusText);
        console.error('   Error details:', errorText);
        return;
      }

      const lists = await response.json();
      console.log('✅ API connection successful!');
      console.log(`   Found ${lists.contacts?.length || 0} contacts in list`);
      
      if (lists.contacts && lists.contacts.length > 0) {
        console.log('   Sample contacts:');
        lists.contacts.slice(0, 3).forEach((contact, index) => {
          console.log(`     ${index + 1}. ${contact.first_name || 'N/A'} ${contact.last_name || 'N/A'} (${contact.email_address})`);
        });
      }
    } catch (apiError) {
      console.error('❌ API connection failed:', apiError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Simple environment variable loading for Docker
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvVars() {
  try {
    // Try to load .env.nwclub file
    const envPath = path.join(path.dirname(__dirname), '.env.nwclub');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (value && !value.startsWith('#')) {
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
          }
        }
      });
      console.log('✅ Loaded environment variables from .env.nwclub');
    } else {
      console.log('⚠️  .env.nwclub file not found, using existing environment variables');
    }
  } catch (error) {
    console.log('⚠️  Could not load .env.nwclub file:', error.message);
  }
}

// Load environment variables and run test
loadEnvVars();
testConnection(); 