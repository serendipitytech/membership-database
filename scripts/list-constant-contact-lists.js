#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
function loadEnvVars() {
  try {
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
    }
  } catch (error) {
    console.log('⚠️  Could not load .env.nwclub file:', error.message);
  }
}

async function getAccessToken() {
  const apiKey = process.env.VITE_CONSTANT_CONTACT_API_KEY;
  const clientSecret = process.env.VITE_CONSTANT_CONTACT_CLIENT_SECRET;
  const refreshToken = process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN;
  
  if (!apiKey || !clientSecret || !refreshToken) {
    throw new Error('Missing required environment variables');
  }

  const credentials = Buffer.from(`${apiKey}:${clientSecret}`).toString('base64');
  
  const response = await fetch('https://authz.constantcontact.com/oauth2/default/v1/token', {
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

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token;
}

async function listContactLists() {
  console.log('🔧 Listing Constant Contact Lists');
  console.log('=================================\n');

  try {
    const accessToken = await getAccessToken();
    const apiKey = process.env.VITE_CONSTANT_CONTACT_API_KEY;
    
    console.log('✅ Got access token, fetching lists...\n');

    const response = await fetch('https://api.cc.email/v3/contact_lists', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch lists:', response.status, response.statusText);
      console.error('   Error details:', errorText);
      return;
    }

    const data = await response.json();
    
    if (!data.lists || data.lists.length === 0) {
      console.log('📝 No contact lists found in your account');
      return;
    }

    console.log(`📝 Found ${data.lists.length} contact list(s):\n`);
    
    data.lists.forEach((list, index) => {
      console.log(`${index + 1}. List Name: ${list.name}`);
      console.log(`   List ID: ${list.list_id}`);
      console.log(`   Contact Count: ${list.contact_count || 0}`);
      console.log(`   Created: ${list.created_at || 'N/A'}`);
      console.log(`   Updated: ${list.updated_at || 'N/A'}`);
      console.log('');
    });

    console.log('💡 Copy the List ID you want to use and update your .env.nwclub file:');
    console.log('   VITE_CONSTANT_CONTACT_LIST_ID=your_chosen_list_id');

  } catch (error) {
    console.error('❌ Error listing contact lists:', error.message);
  }
}

// Run the script
loadEnvVars();
listContactLists(); 