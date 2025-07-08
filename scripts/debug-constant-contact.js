#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(process.cwd(), '.env.nwclub');
dotenv.config({ path: envPath });

console.log('✅ Loaded environment variables from .env.nwclub');

const API_KEY = process.env.VITE_CONSTANT_CONTACT_API_KEY;
const CLIENT_SECRET = process.env.VITE_CONSTANT_CONTACT_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN;
const LIST_ID = process.env.VITE_CONSTANT_CONTACT_LIST_ID;

if (!API_KEY || !CLIENT_SECRET || !REFRESH_TOKEN || !LIST_ID) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const TOKEN_URL = 'https://authz.constantcontact.com/oauth2/default/v1/token';
const BASE_URL = 'https://api.cc.email/v3';

async function getAccessToken() {
  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${API_KEY}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const tokenData = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ Error refreshing access token:', error);
    throw error;
  }
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const accessToken = await getAccessToken();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let responseData;
  
  try {
    responseData = responseText ? JSON.parse(responseText) : null;
  } catch (e) {
    responseData = { raw_response: responseText };
  }

  return {
    status: response.status,
    statusText: response.statusText,
    data: responseData,
    headers: Object.fromEntries(response.headers.entries())
  };
}

async function testEndpoint(name, endpoint, options = {}) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   URL: ${BASE_URL}${endpoint}`);
  
  try {
    const result = await makeRequest(endpoint, options);
    
    if (result.status === 200) {
      console.log(`   Status: ${result.status} OK`);
      console.log(`   ✅ Success! Response keys: ${Object.keys(result.data || {}).join(', ')}`);
      
      if (result.data && typeof result.data === 'object') {
        // Show a sample of the data structure
        const sample = JSON.stringify(result.data, null, 2).substring(0, 500);
        if (sample.length > 0) {
          console.log(`   📄 Sample response: ${sample}${sample.length >= 500 ? '...' : ''}`);
        }
      }
    } else {
      console.log(`   Status: ${result.status} ${result.statusText}`);
      console.log(`   ❌ Error: ${JSON.stringify(result.data, null, 2)}`);
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }
}

async function main() {
  console.log('🔧 Debugging Constant Contact API');
  console.log('=================================');

  try {
    const accessToken = await getAccessToken();
    console.log('✅ Got access token');
    console.log(`📋 List ID: ${LIST_ID}\n`);

    // Test various endpoints
    await testEndpoint('List details endpoint', `/contact_lists/${LIST_ID}`);
    await testEndpoint('All lists endpoint', '/contact_lists');
    
    // Test contacts endpoints with different variations
    await testEndpoint('Standard contacts endpoint', `/contact_lists/${LIST_ID}/contacts`);
    await testEndpoint('Contacts with limit', `/contact_lists/${LIST_ID}/contacts?limit=50`);
    await testEndpoint('Contacts with include_count', `/contact_lists/${LIST_ID}/contacts?include_count=true`);
    await testEndpoint('Contacts with status filter', `/contact_lists/${LIST_ID}/contacts?status=SUBSCRIBED`);
    
    // Test general contacts endpoint
    await testEndpoint('All contacts endpoint', '/contacts?limit=10');
    
    // Test list membership endpoint (alternative)
    await testEndpoint('List membership endpoint', `/contact_lists/${LIST_ID}/members`);
    
    // Test if we can create a test contact
    console.log('\n🔍 Testing: Create test contact');
    try {
      const testContact = {
        email_address: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        create_source: 'Contact'
      };
      
      const result = await makeRequest('/contacts', {
        method: 'POST',
        body: JSON.stringify(testContact)
      });
      
      if (result.status === 201 || result.status === 200) {
        console.log('   ✅ Successfully created test contact');
        console.log(`   📄 Response: ${JSON.stringify(result.data, null, 2)}`);
        
        // Try to add to list
        if (result.data && result.data.contact_id) {
          console.log('\n🔍 Testing: Add test contact to list');
          const addResult = await makeRequest(`/contact_lists/${LIST_ID}/contacts`, {
            method: 'POST',
            body: JSON.stringify({
              contact_ids: [result.data.contact_id]
            })
          });
          
          if (addResult.status === 200 || addResult.status === 201) {
            console.log('   ✅ Successfully added test contact to list');
          } else {
            console.log(`   ❌ Failed to add to list: ${addResult.status} ${addResult.statusText}`);
            console.log(`   📄 Error: ${JSON.stringify(addResult.data, null, 2)}`);
          }
        }
      } else {
        console.log(`   ❌ Failed to create test contact: ${result.status} ${result.statusText}`);
        console.log(`   📄 Error: ${JSON.stringify(result.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Create contact failed: ${error.message}`);
    }

    console.log('\n📝 Summary:');
    console.log('If the "List details endpoint" works but "Standard contacts endpoint" fails,');
    console.log('it might be that the list is empty or there\'s a permission issue.');
    console.log('\nTry creating a test contact first to populate the list.');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

main(); 