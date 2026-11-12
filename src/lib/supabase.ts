import { createClient } from '@supabase/supabase-js';
import { UserAccount, PlanTierType, STORAGE_KEY_USER, STORAGE_KEY_USERS_DB } from '../types/auth';
import { hashPassword, verifyPassword } from './security';

// 1. Read Supabase credentials from Vite environment variables (.env)
// Supports both VITE_ prefixed and standard SUPABASE_ prefixed variables
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.SUPABASE_URL || 
  '';

const supabaseKey = 
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.SUPABASE_ANON_KEY || 
  '';

// Detect if Supabase is properly configured
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('https://')
);

// 2. Initialize Supabase Client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * SIGN UP USER:
 * Inserts a new record into the "Credentials" table:
 * - "Name": fullName
 * - "Email": email
 * - "Password": password
 * - "Tier": 'free'
 * - "companyName": companyName
 * - "companyLogo": companyLogo
 */
export async function signUpUser(params: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  companyLogo?: string | null;
}): Promise<{ account: UserAccount | null; error: string | null }> {
  const { email, password, fullName, companyName, companyLogo } = params;
  const normalizedEmail = email.trim().toLowerCase();

  if (!companyLogo || !companyLogo.trim()) {
    return { account: null, error: 'Company logo is required to create an account.' };
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Check if user with this email already exists in "Credentials"
      const { data: existingUser, error: checkError } = await supabase
        .from('Credentials')
        .select('id')
        .ilike('Email', normalizedEmail)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('Check user query notice:', checkError);
      }

      if (existingUser) {
        return { account: null, error: 'An account with this email already exists. Please log in.' };
      }

      // 2. Cryptographically hash password before storing in Supabase
      const hashedPassword = await hashPassword(password);

      // 3. Insert new user into "Credentials"
      const { data: createdRow, error: insertError } = await supabase
        .from('Credentials')
        .insert([
          {
            Name: fullName,
            Email: normalizedEmail,
            Password: hashedPassword,
            Tier: 'free',
            companyName: companyName,
            companyLogo: companyLogo || null,
          },
        ])
        .select()
        .single();

      if (insertError) {
        return { account: null, error: insertError.message || 'Failed to create user in Credentials table.' };
      }

      if (!createdRow) {
        return { account: null, error: 'Sign up failed. Please try again.' };
      }

      const account: UserAccount = {
        id: String(createdRow.id),
        email: createdRow.Email || normalizedEmail,
        name: createdRow.Name || fullName,
        companyName: createdRow.companyName || companyName,
        companyLogo: createdRow.companyLogo || undefined,
        planTier: (createdRow.Tier?.toLowerCase() || 'free') as PlanTierType,
        billingCycle: 'monthly',
        createdAt: createdRow.created_at || new Date().toISOString(),
      };

      // Persist active session in localStorage
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

    if (usersDb.some((u: any) => u.email.toLowerCase() === normalizedEmail)) {
      return { account: null, error: 'An account with this work email already exists. Please log in.' };
    }

    const newAccount: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: normalizedEmail,
      name: fullName,
      companyName,
      companyLogo: companyLogo || undefined,
      planTier: 'free',
      billingCycle: 'monthly',
      createdAt: new Date().toISOString(),
    };

    const hashedPassword = await hashPassword(password);

    usersDb.push({
      ...newAccount,
      password: hashedPassword,
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
 * Queries the "Credentials" table by Email and verifies Password.
 */
export async function signInUser(params: {
  email: string;
  password: string;
}): Promise<{ account: UserAccount | null; error: string | null }> {
  const { email, password } = params;
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Query "Credentials" table for matching Email
      const { data: userRow, error: fetchError } = await supabase
        .from('Credentials')
        .select('*')
        .ilike('Email', normalizedEmail)
        .maybeSingle();

      if (fetchError) {
        return { account: null, error: `Authentication error: ${fetchError.message}` };
      }

      if (!userRow) {
        return { account: null, error: 'No account found with this email. Please sign up.' };
      }

      // 2. Cryptographically verify password
      const isPasswordValid = await verifyPassword(password, userRow.Password);
      if (!isPasswordValid) {
        return { account: null, error: 'Incorrect password. Please verify your credentials.' };
      }

      const account: UserAccount = {
        id: String(userRow.id),
        email: userRow.Email || normalizedEmail,
        name: userRow.Name || 'Admin',
        companyName: userRow.companyName || 'My Enterprise',
        companyLogo: userRow.companyLogo || undefined,
        planTier: (userRow.Tier?.toLowerCase() || 'free') as PlanTierType,
        billingCycle: 'monthly',
        createdAt: userRow.created_at || new Date().toISOString(),
      };

      // Persist active session in localStorage
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
      (u: any) => u.email.toLowerCase() === normalizedEmail
    );

    if (!userRecord) {
      return { account: null, error: 'No account found with this email. Please sign up.' };
    }

    const isPasswordValid = await verifyPassword(password, userRecord.password);
    if (!isPasswordValid) {
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
      // Ignored for custom credentials table
    }
  }
  localStorage.removeItem(STORAGE_KEY_USER);
}

/**
 * UPDATE PLAN TIER:
 * Updates the "Tier" column in the "Credentials" table and localStorage.
 */
export async function updatePlanTierInSupabase(
  userId: string,
  newTier: PlanTierType,
  cycle: 'monthly' | 'annual'
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      // Update "Tier" in "Credentials" table
      const numericId = Number(userId);
      const query = supabase
        .from('Credentials')
        .update({
          Tier: newTier,
        });

      if (!isNaN(numericId)) {
        await query.eq('id', numericId);
      } else {
        await query.eq('id', userId);
      }
    } catch (e) {
      console.warn('Failed to update Tier in Credentials table:', e);
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
