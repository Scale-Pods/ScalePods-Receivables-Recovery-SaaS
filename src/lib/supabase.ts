import { createClient } from '@supabase/supabase-js';
import { UserAccount, PlanTierType, STORAGE_KEY_USER, STORAGE_KEY_USERS_DB } from '../types/auth';

// 1. Read Supabase credentials from Vite environment variables (.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if Supabase is properly configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// 2. Initialize Supabase Client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * SIGN UP USER:
 * 1. Sends credentials to Supabase Auth.
 *    -> Supabase backend encrypts & hashes the password using bcrypt with salt (Argon2/bcrypt).
 *    -> Passwords are NEVER stored in plaintext.
 * 2. Saves full_name, company_name, company_logo, and plan_tier ('free') to auth metadata and public.profiles table.
 * 3. Falls back smoothly to local storage simulation if Supabase credentials are not yet added to .env.
 */
export async function signUpUser(params: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  companyLogo?: string | null;
}): Promise<{ account: UserAccount | null; error: string | null }> {
  const { email, password, fullName, companyName, companyLogo } = params;

  if (isSupabaseConfigured && supabase) {
    try {
      // Supabase Auth handles password hashing (bcrypt)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
            company_logo: companyLogo || null,
            plan_tier: 'free',
          },
        },
      });

      if (authError) {
        return { account: null, error: authError.message };
      }

      const user = authData.user;
      if (!user) {
        return { account: null, error: 'Sign up failed. Please try again.' };
      }

      // Upsert into public.profiles table
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          company_name: companyName,
          company_logo: companyLogo || null,
          plan_tier: 'free',
          billing_cycle: 'monthly',
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Profile table upsert note (metadata is already preserved in auth.users):', dbErr);
      }

      const account: UserAccount = {
        id: user.id,
        email: user.email || email,
        name: fullName,
        companyName,
        companyLogo: companyLogo || undefined,
        planTier: 'free',
        billingCycle: 'monthly',
        createdAt: user.created_at || new Date().toISOString(),
      };

      // Persist active session in localStorage for instant access across reloads & recovery-saas
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(account));
      return { account, error: null };
    } catch (err: any) {
      return { account: null, error: err?.message || 'Network error connecting to Supabase.' };
    }
  }

  // --- LOCAL DEV MODE (Fallback when Supabase .env keys are not provided yet) ---
  try {
    const usersDbRaw = localStorage.getItem(STORAGE_KEY_USERS_DB) || '[]';
    const usersDb = JSON.parse(usersDbRaw);

    if (usersDb.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return { account: null, error: 'An account with this work email already exists.' };
    }

    const newAccount: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email,
      name: fullName,
      companyName,
      companyLogo: companyLogo || undefined,
      planTier: 'free',
      billingCycle: 'monthly',
      createdAt: new Date().toISOString(),
    };

    // Store encrypted mock entry (base64 + salt hash simulation for dev mode)
    usersDb.push({
      ...newAccount,
      passwordHash: btoa(`salt_${password}_recovr`),
    });

    localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(usersDb));
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newAccount));

    return { account: newAccount, error: null };
  } catch (err: any) {
    return { account: null, error: err?.message || 'Local storage error' };
  }
}

/**
 * SIGN IN USER:
 * 1. Authenticates against Supabase Auth (verifies encrypted password hash).
 * 2. Fetches company profile details from public.profiles or user metadata.
 * 3. Falls back smoothly to local DB if Supabase is not yet configured.
 */
export async function signInUser(params: {
  email: string;
  password: string;
}): Promise<{ account: UserAccount | null; error: string | null }> {
  const { email, password } = params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { account: null, error: authError.message };
      }

      const user = authData.user;
      if (!user) {
        return { account: null, error: 'User record not found.' };
      }

      // Try reading user profile from public.profiles
      let profileData: any = null;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        profileData = data;
      } catch (e) {
        console.warn('Could not fetch from profiles table, using user_metadata fallback:', e);
      }

      const meta = user.user_metadata || {};
      const account: UserAccount = {
        id: user.id,
        email: user.email || email,
        name: profileData?.full_name || meta.full_name || 'Admin',
        companyName: profileData?.company_name || meta.company_name || 'My Enterprise',
        companyLogo: profileData?.company_logo || meta.company_logo || null,
        planTier: (profileData?.plan_tier || meta.plan_tier || 'free') as PlanTierType,
        billingCycle: (profileData?.billing_cycle || meta.billing_cycle || 'monthly') as 'monthly' | 'annual',
        createdAt: user.created_at || new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(account));
      return { account, error: null };
    } catch (err: any) {
      return { account: null, error: err?.message || 'Failed to authenticate with Supabase.' };
    }
  }

  // --- LOCAL DEV MODE Fallback ---
  try {
    const usersDbRaw = localStorage.getItem(STORAGE_KEY_USERS_DB) || '[]';
    const usersDb = JSON.parse(usersDbRaw);

    const userRecord = usersDb.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!userRecord) {
      return { account: null, error: 'No account found with this email. Please sign up.' };
    }

    const expectedHash = btoa(`salt_${password}_recovr`);
    if (userRecord.passwordHash && userRecord.passwordHash !== expectedHash) {
      return { account: null, error: 'Incorrect password. Please verify your credentials.' };
    }

    const account: UserAccount = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      companyName: userRecord.companyName,
      companyLogo: userRecord.companyLogo || undefined,
      planTier: userRecord.planTier || 'free',
      billingCycle: userRecord.billingCycle || 'monthly',
      createdAt: userRecord.createdAt,
    };

    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(account));
    return { account, error: null };
  } catch (err: any) {
    return { account: null, error: err?.message || 'Local sign in error' };
  }
}

/**
 * SIGN OUT:
 * Clears Supabase session and localStorage.
 */
export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out notice:', e);
    }
  }
  localStorage.removeItem(STORAGE_KEY_USER);
}

/**
 * UPDATE PLAN TIER:
 * Updates plan tier in Supabase profiles and local state.
 */
export async function updatePlanTierInSupabase(
  userId: string,
  newTier: PlanTierType,
  cycle: 'monthly' | 'annual'
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('profiles')
        .update({
          plan_tier: newTier,
          billing_cycle: cycle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (e) {
      console.warn('Failed to update tier in Supabase:', e);
    }
  }

  // Update active localStorage session
  const stored = localStorage.getItem(STORAGE_KEY_USER);
  if (stored) {
    try {
      const parsed: UserAccount = JSON.parse(stored);
      parsed.planTier = newTier;
      parsed.billingCycle = cycle;
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(parsed));
    } catch (e) {
      console.warn('Failed to update local storage user tier:', e);
    }
  }
}
