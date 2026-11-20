import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, redirectUri, customerUid } = req.body || {};

    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: 'Server is missing Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
      });
    }

    // 1. Exchange authorization code with Google for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({
        error: tokenData.error_description || tokenData.error || 'Google token exchange failed',
      });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    // 2. Fetch authenticated user's email address
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();
    const email = profile.email || 'accounts@workspace';

    // 3. Store refresh token in Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const rowPayload = {
        customer_uid: customerUid || 'local_user',
        provider: 'google',
        connected_email: email,
        refresh_token: refreshToken || '',
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      // Try customer_uid primary key
      const attempt1 = await supabase.from('user_email_integrations').upsert(rowPayload, { onConflict: 'customer_uid' });
      if (attempt1.error) {
        // Fallback to customer_uid,provider or default
        const attempt2 = await supabase.from('user_email_integrations').upsert(rowPayload, { onConflict: 'customer_uid,provider' });
        if (attempt2.error) {
          await supabase.from('user_email_integrations').upsert(rowPayload);
        }
      }

      // 4. Sync connected_email to "Credentials" table
      if (customerUid && customerUid !== 'local_user') {
        const numericId = Number(customerUid);
        const idVal = !isNaN(numericId) && numericId > 0 && String(numericId) === String(customerUid) ? numericId : customerUid;
        const credAttempt1 = await supabase.from('Credentials').update({ connected_email: email }).eq('uid', customerUid);
        if (credAttempt1.error) {
          const credAttempt2 = await supabase.from('Credentials').update({ connected_email: email }).eq('id', idVal);
          if (credAttempt2.error) {
            await supabase.from('Credentials').update({ connected_email: email }).eq('customer_uid', customerUid);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      email,
    });
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
