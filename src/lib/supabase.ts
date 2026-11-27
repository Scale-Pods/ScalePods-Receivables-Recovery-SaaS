import { createClient } from '@supabase/supabase-js';
import { UserAccount, PlanTierType, UserRole, STORAGE_KEY_USER, STORAGE_KEY_USERS_DB } from '../types/auth';
import { hashPassword, verifyPassword } from './security';
import { validateWorkEmail, getTierSeatLimit, getHighestTier } from './workEmailValidator';

// 1. Read Supabase credentials from Vite environment variables (.env)
// Supports both VITE_ prefixed and standard SUPABASE_ prefixed variables
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.SUPABASE_URL || 
  '';

// Pricing is never read with this client: recovery_plan_limits.Price comes
// only from the server-side /api/plan-limits endpoint.
const supabaseKey = 
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
  role?: UserRole;
}): Promise<{ account: UserAccount | null; error: string | null }> {
  const { email, password, fullName, companyName, companyLogo, role = 'client' } = params;
  const normalizedEmail = email.trim().toLowerCase();

  // Phase 1: Work Email Validation (Filtering Out Personal / Disposable Emails)
  const emailValidation = validateWorkEmail(normalizedEmail);
  if (!emailValidation.isValid) {
    return { account: null, error: emailValidation.error || 'Please use a corporate work email address.' };
  }
  const domain = emailValidation.domain;
  const rootDomain = emailValidation.rootDomain || domain;

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

      // Phase 2: Domain-Level Seat Quota Enforcement
      // Checks across rootDomain to prevent subdomain bypass abuse (e.g. sales.acme.com vs eng.acme.com)
      let assignedTier: PlanTierType = 'free';
      let isOrgOwner = true;

      const { data: domainAccounts, error: domainCheckError } = await supabase
        .from('Credentials')
        .select('*')
        .or(`Email.ilike.%@${rootDomain},Email.ilike.%.${rootDomain}`);

      if (domainCheckError) {
        console.warn('Domain quota check notice:', domainCheckError);
      }

      if (domainAccounts && domainAccounts.length > 0) {
        isOrgOwner = false; // Existing account(s) exist; this user is a team member
        // Find highest active tier across company domain accounts
        let highestTier = 'free';
        for (const acct of domainAccounts) {
          const t = (acct.Tier || acct.tier || 'free').toLowerCase();
          highestTier = getHighestTier(highestTier, t);
        }
        const maxSeats = getTierSeatLimit(highestTier);

        if (domainAccounts.length >= maxSeats) {
          return {
            account: null,
            error: `Your organization (${rootDomain}) has reached its limit of ${maxSeats} accounts on the ${highestTier.toUpperCase()} plan. To add more team members, an existing team member must upgrade your company workspace to Growth (5 accounts) or Enterprise (10 accounts).`,
          };
        }

        // Automatically inherit company's upgraded workspace tier
        assignedTier = highestTier as PlanTierType;
      }

      // 2. Cryptographically hash password before storing in Supabase
      const hashedPassword = await hashPassword(password);

      // 3. Insert new user into "Credentials" (Account #1 is marked owner, subsequent users are team members)
      const initialRole: UserRole = isOrgOwner ? 'owner' : (role || 'client');
      const insertPayload: Record<string, any> = {
        Name: fullName,
        Email: normalizedEmail,
        Password: hashedPassword,
        Tier: assignedTier,
        companyName: companyName,
        companyLogo: companyLogo || null,
        Role: initialRole,
      };

      let createdRow: any = null;
      let insertError: any = null;

      const firstAttempt = await supabase
        .from('Credentials')
        .insert([insertPayload])
        .select()
        .single();

      createdRow = firstAttempt.data;
      insertError = firstAttempt.error;

      // Graceful fallback if the "Role" or "role" column has not been added to Credentials table yet
      if (insertError && (insertError.message?.toLowerCase().includes('column "role"') || insertError.code === '42703')) {
        delete insertPayload.Role;
        delete insertPayload.role;
        const retryAttempt = await supabase
          .from('Credentials')
          .insert([insertPayload])
          .select()
          .single();
        createdRow = retryAttempt.data;
        insertError = retryAttempt.error;
      }

      if (insertError) {
        return { account: null, error: insertError.message || 'Failed to create user in Credentials table.' };
      }

      if (!createdRow) {
        return { account: null, error: 'Sign up failed. Please try again.' };
      }

      // Read role from DB (checks both Role and role, defaults to 'client')
      const rawRole = (createdRow.Role ?? createdRow.role)
        ? String(createdRow.Role ?? createdRow.role).trim().toLowerCase()
        : null;
      const assignedRole: UserRole = rawRole === 'developer' ? 'developer' : rawRole === 'owner' ? 'owner' : isOrgOwner ? 'owner' : 'client';

      const customerUid = (createdRow.customer_uid ?? createdRow.uid)
        ? String(createdRow.customer_uid ?? createdRow.uid)
        : String(createdRow.id);

      const account: UserAccount = {
        id: String(createdRow.id),
        customer_uid: customerUid,
        uid: customerUid,
        email: createdRow.Email || normalizedEmail,
        connected_email: createdRow.connected_email || undefined,
        name: createdRow.Name || fullName,
        companyName: createdRow.companyName || companyName,
        companyLogo: createdRow.companyLogo || undefined,
        planTier: ((createdRow.Tier ?? createdRow.tier)?.toLowerCase() || 'free') as PlanTierType,
        billingCycle: 'monthly',
        role: assignedRole,
        isOwner: isOrgOwner || assignedRole === 'owner',
        domain: rootDomain,
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

    // Phase 2: Domain-Level Seat Quota in Local Storage (matches across root domain)
    const domainAccounts = usersDb.filter((u: any) => {
      const e = (u.email || '').toLowerCase();
      return e.endsWith(`@${rootDomain}`) || e.includes(`.${rootDomain}`);
    });
    let assignedTier: PlanTierType = 'free';
    const isOrgOwner = domainAccounts.length === 0;

    if (domainAccounts.length > 0) {
      let highestTier = 'free';
      for (const acct of domainAccounts) {
        const t = (acct.planTier || acct.Tier || acct.tier || 'free').toLowerCase();
        highestTier = getHighestTier(highestTier, t);
      }
      const maxSeats = getTierSeatLimit(highestTier);

      if (domainAccounts.length >= maxSeats) {
        return {
          account: null,
          error: `Your organization (${rootDomain}) has reached its limit of ${maxSeats} accounts on the ${highestTier.toUpperCase()} plan. To add more team members, an existing team member must upgrade your company workspace to Growth (5 accounts) or Enterprise (10 accounts).`,
        };
      }

      assignedTier = highestTier as PlanTierType;
    }

    const assignedRole: UserRole = isOrgOwner ? 'owner' : (role || 'client');

    const newAccount: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: normalizedEmail,
      name: fullName,
      companyName,
      companyLogo: companyLogo || undefined,
      planTier: assignedTier,
      billingCycle: 'monthly',
      role: assignedRole,
      isOwner: isOrgOwner,
      domain: rootDomain,
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

      // Read role from DB column "Role" or "role" in Supabase Credentials table
      const rawRole = (userRow.Role ?? userRow.role)
        ? String(userRow.Role ?? userRow.role).trim().toLowerCase()
        : null;
      const assignedRole: UserRole = rawRole === 'developer' ? 'developer' : 'client';

      const customerUid = (userRow.customer_uid ?? userRow.uid)
        ? String(userRow.customer_uid ?? userRow.uid)
        : String(userRow.id);

      const account: UserAccount = {
        id: String(userRow.id),
        customer_uid: customerUid,
        uid: customerUid,
        email: userRow.Email || normalizedEmail,
        connected_email: userRow.connected_email || undefined,
        name: userRow.Name || 'Admin',
        companyName: userRow.companyName || 'My Enterprise',
        companyLogo: userRow.companyLogo || undefined,
        planTier: ((userRow.Tier ?? userRow.tier)?.toLowerCase() || 'free') as PlanTierType,
        billingCycle: 'monthly',
        role: assignedRole,
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

    const rawRole = userRecord.role ? String(userRecord.role).trim().toLowerCase() : null;
    const assignedRole: UserRole = rawRole === 'developer' ? 'developer' : 'client';

    const account: UserAccount = {
      id: userRecord.id,
      customer_uid: userRecord.customer_uid || userRecord.uid || userRecord.id,
      uid: userRecord.uid || userRecord.customer_uid || userRecord.id,
      email: userRecord.email,
      connected_email: userRecord.connected_email || undefined,
      name: userRecord.name,
      companyName: userRecord.companyName,
      companyLogo: userRecord.companyLogo || undefined,
      planTier: userRecord.planTier || 'free',
      billingCycle: userRecord.billingCycle || 'monthly',
      role: assignedRole,
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

interface CredentialFilter {
  column: string;
  operator: 'eq' | 'ilike';
  value: string | number;
}

async function tryCredentialFilter(
  filter: CredentialFilter
): Promise<{ row: any | null; columnExists: boolean }> {
  if (!supabase) return { row: null, columnExists: false };

  try {
    // Select every column instead of guessing names: PostgREST returns 400 as
    // soon as a single select field does not exist, which made the old
    // multi-column fallback loop fail on every deployment.
    const query = supabase.from('Credentials').select('*');
    const { data, error } = await (filter.operator === 'ilike'
      ? query.ilike(filter.column, String(filter.value))
      : query.eq(filter.column, filter.value)
    ).maybeSingle();

    if (error) return { row: null, columnExists: false };
    return { row: data, columnExists: true };
  } catch {
    return { row: null, columnExists: false };
  }
}

/**
 * Reads the authoritative account state from Supabase. The browser keeps a
 * cached session in localStorage, so a tier edited directly in the Credentials
 * table would otherwise never be reflected in the UI.
 *
 * Each lookup has ordered column alternatives. An alternative is only tried
 * when the previous column is missing from the schema, not when a valid column
 * simply has no matching row.
 */
async function readCredentialsRow(lookups: CredentialFilter[][]): Promise<any | null> {
  for (const alternatives of lookups) {
    for (const filter of alternatives) {
      const { row, columnExists } = await tryCredentialFilter(filter);
      if (row) return row;
      if (columnExists) break;
    }
  }
  return null;
}

export async function fetchRemoteAccountState(
  user: Pick<UserAccount, 'email' | 'customer_uid' | 'uid' | 'id'>
): Promise<{ tier: PlanTierType | null; uid: string | null } | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const planTiers: PlanTierType[] = ['free', 'basic', 'growth', 'enterprise'];

  const normalize = (row: any) => {
    const rawTier = row?.Tier ?? row?.tier ?? row?.plan_tier ?? '';
    const tierValue = String(rawTier).trim().toLowerCase() as PlanTierType;
    const rawUid = row?.customer_uid ?? row?.uid ?? row?.id;
    return {
      tier: planTiers.includes(tierValue) ? tierValue : null,
      uid: rawUid !== undefined && rawUid !== null ? String(rawUid) : null,
    };
  };

  try {
    const lookups: CredentialFilter[][] = [];

    const email = (user.email || '').trim().toLowerCase();
    if (email) {
      lookups.push([
        { column: 'Email', operator: 'ilike', value: email },
        { column: 'email', operator: 'ilike', value: email },
      ]);
    }

    const uid = user.customer_uid || user.uid || '';
    if (uid && uid !== 'local_user') {
      lookups.push([
        { column: 'uid', operator: 'eq', value: uid },
        { column: 'customer_uid', operator: 'eq', value: uid },
      ]);
    }

    const numericId = Number(user.id);
    if (!Number.isNaN(numericId) && numericId > 0) {
      lookups.push([{ column: 'id', operator: 'eq', value: numericId }]);
    }

    const row = await readCredentialsRow(lookups);
    return row ? normalize(row) : null;
  } catch (err) {
    console.warn('Unable to refresh account state from Supabase:', err);
  }

  return null;
}

/**
 * UPDATE PLAN TIER:
 * Updates the "Tier" column in the "Credentials" table and localStorage.
 */
export async function updatePlanTierInSupabase(
  userId: string,
  newTier: PlanTierType,
  cycle: 'monthly' | 'annual',
  userEmail?: string,
  customerUid?: string
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Update "Tier" in "Credentials" table
      // Uses Email matching first to prevent PostgreSQL "invalid input syntax for integer: UUID" errors
      let credUpdated = false;
      const cleanEmail = (userEmail || '').toLowerCase().trim();

      if (cleanEmail) {
        // Try uppercase "Tier"
        const attempt1 = await supabase
          .from('Credentials')
          .update({ Tier: newTier })
          .ilike('Email', cleanEmail);
        
        if (!attempt1.error) {
          credUpdated = true;
        } else {
          // Fallback to lowercase "tier"
          const attempt2 = await supabase
            .from('Credentials')
            .update({ tier: newTier })
            .ilike('Email', cleanEmail);
          if (!attempt2.error) credUpdated = true;
        }
      }

      // If not updated by Email, try matching by uid
      const targetUid = customerUid || userId;
      if (!credUpdated && targetUid && targetUid !== 'local_user') {
        const attemptUid1 = await supabase
          .from('Credentials')
          .update({ Tier: newTier })
          .eq('uid', targetUid);

        if (!attemptUid1.error) {
          credUpdated = true;
        } else {
          const attemptUid2 = await supabase
            .from('Credentials')
            .update({ tier: newTier })
            .eq('uid', targetUid);
          if (!attemptUid2.error) credUpdated = true;
        }
      }

      // If still not updated, try matching by numeric id
      const numericId = Number(userId);
      if (!credUpdated && !isNaN(numericId) && numericId > 0) {
        const attemptId1 = await supabase
          .from('Credentials')
          .update({ Tier: newTier })
          .eq('id', numericId);

        if (attemptId1.error) {
          await supabase
            .from('Credentials')
            .update({ tier: newTier })
            .eq('id', numericId);
        }
      }

      // 2. Also sync plan_tier to all existing invoices in recovery_outreach table
      // Matches by both customer_uid and customer_email to guarantee coverage
      try {
        if (targetUid && targetUid !== 'local_user') {
          await supabase
            .from('recovery_outreach')
            .update({ plan_tier: newTier })
            .eq('customer_uid', String(targetUid));
        }

        if (cleanEmail) {
          await supabase
            .from('recovery_outreach')
            .update({ plan_tier: newTier })
            .ilike('customer_email', cleanEmail);
        }
      } catch (err) {
        console.warn('Notice updating plan_tier in recovery_outreach table:', err);
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
