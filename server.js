import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.nwclub
dotenv.config({ path: '.env.nwclub' });

// Debug: Log environment variables (first few characters only)
console.log('Environment variables loaded:');
console.log('API Key:', process.env.VITE_CONSTANT_CONTACT_API_KEY ? `${process.env.VITE_CONSTANT_CONTACT_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('Refresh Token:', process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN ? `${process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN.substring(0, 10)}...` : 'NOT SET');
console.log('List ID:', process.env.VITE_CONSTANT_CONTACT_LIST_ID ? `${process.env.VITE_CONSTANT_CONTACT_LIST_ID.substring(0, 10)}...` : 'NOT SET');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(cors());
app.use(express.json());

// Test connection endpoint
app.get('/api/constant-contact/test-connection', async (req, res) => {
  try {
    const apiKey = process.env.VITE_CONSTANT_CONTACT_API_KEY;
    const clientSecret = process.env.VITE_CONSTANT_CONTACT_CLIENT_SECRET || ''; // Optional with PKCE
    const refreshToken = process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN;
    const listId = process.env.VITE_CONSTANT_CONTACT_LIST_ID;
    if (!apiKey || !refreshToken || !listId) {
      return res.status(400).json({ ok: false, message: 'Missing required Constant Contact environment variables: API key, refresh token, and list ID' });
    }
    
    // Get access token first
    const tokenResponse = await fetch('https://authz.constantcontact.com/oauth2/default/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: apiKey,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh failed:', tokenResponse.status, errorText);
      throw new Error(`Token refresh failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Test API connection by fetching list members
    const apiResponse = await fetch(`https://api.cc.email/v3/contacts?list_id=${listId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!apiResponse.ok) {
      throw new Error(`API request failed: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    const memberCount = data.contacts ? data.contacts.length : 0;
    
    return res.status(200).json({ ok: true, message: 'Connection successful', memberCount });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Unknown error' });
  }
});

// List members endpoint
app.get('/api/constant-contact/list-members', async (req, res) => {
  try {
    const apiKey = process.env.VITE_CONSTANT_CONTACT_API_KEY;
    const clientSecret = process.env.VITE_CONSTANT_CONTACT_CLIENT_SECRET || ''; // Optional with PKCE
    const refreshToken = process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN;
    const listId = process.env.VITE_CONSTANT_CONTACT_LIST_ID;
    if (!apiKey || !refreshToken || !listId) {
      return res.status(400).json({ ok: false, message: 'Missing required Constant Contact environment variables: API key, refresh token, and list ID' });
    }
    
    // Get access token first
    const tokenResponse = await fetch('https://authz.constantcontact.com/oauth2/default/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: apiKey,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh failed:', tokenResponse.status, errorText);
      throw new Error(`Token refresh failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch list members
    const apiResponse = await fetch(`https://api.cc.email/v3/contacts?list_id=${listId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!apiResponse.ok) {
      throw new Error(`API request failed: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    const members = (data.contacts || []).map(c => ({
      contact_id: c.contact_id,
      email_address: c.email_address?.address || '',
      first_name: c.first_name,
      last_name: c.last_name,
      status: c.status || c.email_address?.permission_to_send || '',
    }));
    
    return res.status(200).json({ ok: true, members });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Unknown error' });
  }
});

// Token refresh endpoint
app.post('/api/constant-contact-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const apiKey = process.env.VITE_CONSTANT_CONTACT_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Constant Contact API key not configured' });
  }

  try {
    const response = await fetch('https://authz.constantcontact.com/oauth2/default/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: apiKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Token refresh failed: ${response.status} ${response.statusText}`,
        details: errorText 
      });
    }

    const tokenData = await response.json();
    return res.status(200).json(tokenData);
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 