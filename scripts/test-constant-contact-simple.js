import dotenv from 'dotenv';
import path from 'path';

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

async function makeRequest(endpoint, accessToken, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
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

async function testEndpoint(name, endpoint, accessToken, options = {}) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log(`   URL: ${BASE_URL}${endpoint}`);
  
  try {
    const result = await makeRequest(endpoint, accessToken, options);
    
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
  console.log('🔧 Testing Constant Contact API (Simple)');
  console.log('========================================');

  try {
    // Get access token once
    console.log('🔄 Getting access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Got access token');
    console.log(`📋 List ID: ${LIST_ID}\n`);

    // Test key endpoints with the same token
    await testEndpoint('List details endpoint', `/contact_lists/${LIST_ID}`, accessToken);
    await testEndpoint('All lists endpoint', '/contact_lists', accessToken);
    await testEndpoint('Standard contacts endpoint', `/contact_lists/${LIST_ID}/contacts`, accessToken);
    await testEndpoint('All contacts endpoint', '/contacts?limit=10', accessToken);
    
    // Test creating a contact with list membership
    console.log('\n🔍 Testing: Create test contact with list membership');
    try {
      const testContact = {
        email_address: {
          address: 'test.nwclub@example.com',
          permission_to_send: 'implicit'
        },
        first_name: 'Test',
        last_name: 'User',
        create_source: 'Contact',
        list_memberships: [LIST_ID]
      };
      
      const result = await makeRequest('/contacts', accessToken, {
        method: 'POST',
        body: JSON.stringify(testContact)
      });
      
      if (result.status === 201 || result.status === 200) {
        console.log('   ✅ Successfully created test contact with list membership');
        console.log(`   📄 Response: ${JSON.stringify(result.data, null, 2)}`);
        
        // Now try to fetch contacts in the list
        console.log('\n🔍 Testing: Fetch contacts in the list');
        await testEndpoint('Contacts in the list', `/contacts?list_id=${LIST_ID}`, accessToken);
      } else {
        console.log(`   ❌ Failed to create test contact: ${result.status} ${result.statusText}`);
        console.log(`   📄 Error: ${JSON.stringify(result.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Create contact with list membership failed: ${error.message}`);
    }

    console.log('\n📝 Summary:');
    console.log('This test used a single access token to avoid rate limiting.');
    console.log('If the list is empty, creating a test contact should help populate it.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main(); 