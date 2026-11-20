import { supabase, isSupabaseConfigured } from './supabase';

export interface EmailIntegration {
  id?: string;
  customer_uid: string;
  provider: 'google' | 'microsoft';
  connected_email: string;
  refresh_token?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY_PREFIX = 'recovr_email_integration_';

/**
 * Constructs the Google OAuth 2.0 authorization URL
 * requesting offline access so Google returns a refresh_token for background n8n dispatches.
 */
export function getGoogleAuthUrl(customerUid: string): { url: string | null; error?: string } {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!clientId || clientId.includes('your-google-client-id')) {
    return {
      url: null,
      error: 'VITE_GOOGLE_CLIENT_ID is not configured in your environment variables (.env).',
    };
  }

  const redirectUri = `${window.location.origin}/auth/callback/google`;
  const scopes = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline', // Required to obtain refresh_token
    prompt: 'consent',       // Forces Google consent screen to ensure refresh_token is returned
    state: customerUid,      // Pass customer identifier to verify on return
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

/**
 * Load active email integration from Supabase (with localStorage fallback cache)
 */
export async function getEmailIntegration(customerUid: string): Promise<EmailIntegration | null> {
  if (!customerUid) return null;

  // 1. Try reading from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('user_email_integrations')
        .select('*')
        .eq('customer_uid', customerUid)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const integration: EmailIntegration = {
          id: data.id,
          customer_uid: data.customer_uid,
          provider: data.provider || 'google',
          connected_email: data.connected_email,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        // Update local cache
        try {
          localStorage.setItem(`${STORAGE_KEY_PREFIX}${customerUid}`, JSON.stringify(integration));
        } catch {}
        return integration;
      }
    } catch (err) {
      console.warn('Notice loading email integration from Supabase:', err);
    }
  }

  // 2. Fallback to localStorage cache
  try {
    const cached = localStorage.getItem(`${STORAGE_KEY_PREFIX}${customerUid}`);
    if (cached) {
      return JSON.parse(cached) as EmailIntegration;
    }
  } catch {}

  return null;
}

/**
 * Exchanges Google OAuth authorization code for tokens and saves to Supabase.
 */
export async function exchangeGoogleAuthCode(params: {
  code: string;
  customerUid: string;
  redirectUri: string;
}): Promise<{ success: boolean; email?: string; error?: string }> {
  const { code, customerUid, redirectUri } = params;

  try {
    // 1. Attempt token exchange via serverless endpoint (/api/google-token-exchange)
    const response = await fetch('/api/google-token-exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        customerUid,
        redirectUri,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.email) {
        // Cache in localStorage
        const integration: EmailIntegration = {
          customer_uid: customerUid,
          provider: 'google',
          connected_email: data.email,
          is_active: true,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${customerUid}`, JSON.stringify(integration));

        // Update active user session in localStorage if current user
        try {
          const storedUserRaw = localStorage.getItem('recovr_user_account');
          if (storedUserRaw) {
            const storedUser = JSON.parse(storedUserRaw);
            storedUser.connected_email = data.email;
            localStorage.setItem('recovr_user_account', JSON.stringify(storedUser));
          }
        } catch {}

        // Direct client sync to Credentials table if Supabase is configured
        if (isSupabaseConfigured && supabase && customerUid && customerUid !== 'local_user') {
          try {
            const numericId = Number(customerUid);
            const idVal = !isNaN(numericId) && numericId > 0 && String(numericId) === String(customerUid) ? numericId : customerUid;
            const res1 = await supabase.from('Credentials').update({ connected_email: data.email }).eq('uid', customerUid);
            if (res1.error) {
              const res2 = await supabase.from('Credentials').update({ connected_email: data.email }).eq('id', idVal);
              if (res2.error) {
                await supabase.from('Credentials').update({ connected_email: data.email }).eq('customer_uid', customerUid);
              }
            }
          } catch (e) {
            console.warn('Notice updating Credentials table with connected_email:', e);
          }
        }

        return { success: true, email: data.email };
      }
    }

    // 2. Client fallback exchange if VITE_GOOGLE_CLIENT_SECRET is available
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (clientId && clientSecret) {
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

      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        throw new Error(errJson.error_description || errJson.error || 'Google token exchange failed');
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;

      // Fetch user profile email from Google
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profileData = await profileRes.json();
      const connectedEmail = profileData.email || 'accounts@workspace';

      // Save to Supabase
      if (isSupabaseConfigured && supabase) {
        const rowPayload = {
          customer_uid: customerUid,
          provider: 'google',
          connected_email: connectedEmail,
          refresh_token: refreshToken,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        const attempt1 = await supabase.from('user_email_integrations').upsert(rowPayload, { onConflict: 'customer_uid' });
        if (attempt1.error) {
          const attempt2 = await supabase.from('user_email_integrations').upsert(rowPayload, { onConflict: 'customer_uid,provider' });
          if (attempt2.error) {
            await supabase.from('user_email_integrations').upsert(rowPayload);
          }
        }

        // Sync to Credentials table
        if (customerUid && customerUid !== 'local_user') {
          const numericId = Number(customerUid);
          const idVal = !isNaN(numericId) && numericId > 0 && String(numericId) === String(customerUid) ? numericId : customerUid;
          const res1 = await supabase.from('Credentials').update({ connected_email: connectedEmail }).eq('uid', customerUid);
          if (res1.error) {
            const res2 = await supabase.from('Credentials').update({ connected_email: connectedEmail }).eq('id', idVal);
            if (res2.error) {
              await supabase.from('Credentials').update({ connected_email: connectedEmail }).eq('customer_uid', customerUid);
            }
          }
        }
      }

      // Cache locally
      const integration: EmailIntegration = {
        customer_uid: customerUid,
        provider: 'google',
        connected_email: connectedEmail,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${customerUid}`, JSON.stringify(integration));

      try {
        const storedUserRaw = localStorage.getItem('recovr_user_account');
        if (storedUserRaw) {
          const storedUser = JSON.parse(storedUserRaw);
          storedUser.connected_email = connectedEmail;
          localStorage.setItem('recovr_user_account', JSON.stringify(storedUser));
        }
      } catch {}

      return { success: true, email: connectedEmail };
    }

    throw new Error('OAuth exchange server returned an error. Please verify Google Cloud credentials.');
  } catch (err: any) {
    console.error('Exchange error:', err);
    return {
      success: false,
      error: err.message || 'Failed to exchange authorization code with Google.',
    };
  }
}

/**
 * Disconnect an active integration
 */
export async function disconnectEmailIntegration(customerUid: string): Promise<boolean> {
  try {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('user_email_integrations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('customer_uid', customerUid);

      if (customerUid && customerUid !== 'local_user') {
        const numericId = Number(customerUid);
        const idVal = !isNaN(numericId) && numericId > 0 && String(numericId) === String(customerUid) ? numericId : customerUid;
        const res1 = await supabase.from('Credentials').update({ connected_email: null }).eq('uid', customerUid);
        if (res1.error) {
          const res2 = await supabase.from('Credentials').update({ connected_email: null }).eq('id', idVal);
          if (res2.error) {
            await supabase.from('Credentials').update({ connected_email: null }).eq('customer_uid', customerUid);
          }
        }
      }
    }

    try {
      const storedUserRaw = localStorage.getItem('recovr_user_account');
      if (storedUserRaw) {
        const storedUser = JSON.parse(storedUserRaw);
        storedUser.connected_email = undefined;
        localStorage.setItem('recovr_user_account', JSON.stringify(storedUser));
      }
    } catch {}

    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${customerUid}`);
    return true;
  } catch (err) {
    console.warn('Disconnect notice:', err);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${customerUid}`);
    return true;
  }
}
