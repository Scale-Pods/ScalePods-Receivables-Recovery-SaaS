import { UserAccount, UserRole } from '../types/auth';

/**
 * Checks if the user has developer privileges strictly from the Supabase database.
 * Requires the user record to have `role === 'developer'`.
 *
 * All role assignments are 100% database-driven via the Supabase "Credentials" table.
 */
export function isDeveloperUser(
  user?: UserAccount | null | { role?: string | null }
): boolean {
  if (!user || !user.role) return false;
  return String(user.role).trim().toLowerCase() === 'developer';
}
