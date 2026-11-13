import { UserAccount, UserRole } from '../types/auth';

/**
 * Retrieves the list of whitelisted developer emails and domains
 * strictly from the VITE_DEVELOPER_EMAILS environment variable.
 *
 * Format: comma-separated list of exact emails or domains starting with '@'.
 * Example in .env:
 * VITE_DEVELOPER_EMAILS=admin@scalepods.com,dev@scalepods.com,@scalepods.com
 */
export function getDeveloperWhitelist(): string[] {
  const envRaw = import.meta.env.VITE_DEVELOPER_EMAILS;
  if (!envRaw || typeof envRaw !== 'string') {
    return [];
  }

  return envRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if a given email is whitelisted as a developer.
 */
export function isDeveloperEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const whitelist = getDeveloperWhitelist();

  return whitelist.some((item) => {
    const entry = item.toLowerCase();
    if (entry.startsWith('@')) {
      return normalized.endsWith(entry);
    }
    return normalized === entry;
  });
}

/**
 * Checks if the current user has developer privileges based on their email.
 */
export function isDeveloperUser(user?: UserAccount | null | { email?: string | null }): boolean {
  if (!user || !user.email) return false;
  return isDeveloperEmail(user.email);
}
