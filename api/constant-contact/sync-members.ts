import { createConstantContactAPI, syncMembersToConstantContact } from '../../src/lib/constantContact';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  try {
    const apiKey = process.env.VITE_CONSTANT_CONTACT_API_KEY;
    const clientSecret = process.env.VITE_CONSTANT_CONTACT_CLIENT_SECRET || ''; // Optional with PKCE
    const refreshToken = process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN;
    const listId = process.env.VITE_CONSTANT_CONTACT_LIST_ID;
    if (!apiKey || !refreshToken || !listId) {
      return res.status(400).json({ ok: false, message: 'Missing required Constant Contact environment variables: API key, refresh token, and list ID' });
    }
    const api = createConstantContactAPI({ apiKey, clientSecret, refreshToken, listId });
    const members = req.body.members;
    if (!Array.isArray(members)) {
      return res.status(400).json({ ok: false, message: 'Missing or invalid members array' });
    }
    const result = await syncMembersToConstantContact(members, api);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Unknown error' });
  }
} 