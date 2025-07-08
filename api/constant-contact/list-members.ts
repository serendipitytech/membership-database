import { createConstantContactAPI } from '../../src/lib/constantContact';

export default async function handler(req, res) {
  try {
    const apiKey = process.env.VITE_CONSTANT_CONTACT_API_KEY;
    const clientSecret = process.env.VITE_CONSTANT_CONTACT_CLIENT_SECRET || ''; // Optional with PKCE
    const refreshToken = process.env.VITE_CONSTANT_CONTACT_REFRESH_TOKEN;
    const listId = process.env.VITE_CONSTANT_CONTACT_LIST_ID;
    if (!apiKey || !refreshToken || !listId) {
      return res.status(400).json({ ok: false, message: 'Missing required Constant Contact environment variables: API key, refresh token, and list ID' });
    }
    const api = createConstantContactAPI({ apiKey, clientSecret, refreshToken, listId });
    const members = await api.getListMembers();
    return res.status(200).json({ ok: true, members });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Unknown error' });
  }
} 