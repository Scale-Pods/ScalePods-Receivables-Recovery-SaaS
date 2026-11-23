/**
 * Work Email & Corporate Domain Validation and Seat Quota Rules
 * 
 * Enforces:
 * 1. Work Email Validation: Blocks consumer/personal and disposable email providers.
 * 2. Domain-Level Seat Quota Enforcement:
 *    - Free Tier: max 3 accounts per domain
 *    - Basic Tier: max 3 accounts per domain
 *    - Growth Tier: max 5 accounts per domain
 *    - Enterprise Tier: max 10 accounts per domain (or custom)
 */

export const BLOCKED_EMAIL_DOMAINS = new Set<string>([
  // Major Consumer / Personal Providers
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'yahoo.com.br',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.es',
  'ymail.com',
  'rocketmail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'outlook.com',
  'outlook.in',
  'live.com',
  'msn.com',
  'passport.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'aim.com',
  'proton.me',
  'protonmail.com',
  'protonmail.ch',
  'zoho.com',
  'zohomail.com',
  'mail.com',
  'email.com',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'yandex.com',
  'yandex.ru',
  'tutanota.com',
  'tuta.com',
  'fastmail.com',
  'rediffmail.com',
  'inbox.com',

  // Disposable / Temporary Mail Providers
  'mailinator.com',
  '10minutemail.com',
  '10minutemail.net',
  'temp-mail.org',
  'tempmail.com',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'throwawaymail.com',
  'yopmail.com',
  'yopmail.fr',
  'sharklasers.com',
  'trashmail.com',
  'trashmail.net',
  'getairmail.com',
  'dispostable.com',
  'burnermail.io',
  'maildrop.cc',
  'crazymailing.com',
  'fakemailgenerator.com',
  'nada.ltd',
  'dropmail.me',
  'mohmal.com',
  'mytemp.email',
  'generator.email',
]);

export const TIER_SEAT_LIMITS: Record<string, number> = {
  free: 3,
  basic: 3,
  growth: 5,
  enterprise: 10,
};

const TIER_HIERARCHY: Record<string, number> = {
  free: 1,
  basic: 2,
  growth: 3,
  enterprise: 4,
};

// Common two-part country-code Second-Level Domains (ccSLDs)
const MULTI_PART_TLDS = new Set<string>([
  'co.in', 'net.in', 'org.in', 'gen.in', 'ind.in', 'nic.in', 'ac.in', 'edu.in', 'res.in', 'gov.in', 'mil.in',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk',
  'co.nz', 'net.nz', 'org.nz',
  'co.za', 'net.za', 'org.za',
  'co.jp', 'ne.jp', 'or.jp',
  'com.br', 'net.br', 'org.br',
  'com.sg', 'edu.sg', 'gov.sg',
]);

/**
 * Extracts root domain to prevent subdomain bypass abuse
 * e.g., 'sales.acme.com' -> 'acme.com'
 * e.g., 'eng.acme.co.in' -> 'acme.co.in'
 */
export function extractRootDomain(domainOrEmail: string): string {
  if (!domainOrEmail) return '';
  let domain = domainOrEmail.includes('@')
    ? domainOrEmail.trim().toLowerCase().split('@')[1] || ''
    : domainOrEmail.trim().toLowerCase();

  domain = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  const parts = domain.split('.').filter(Boolean);
  if (parts.length <= 2) return domain;

  // Check if last two parts form a known multi-part TLD (e.g. co.in)
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_TLDS.has(lastTwo)) {
    return parts.slice(-3).join('.');
  }

  // Standard TLD: take last 2 parts (e.g. acme.com)
  return parts.slice(-2).join('.');
}

/**
 * Extracts normalized domain from an email address
 */
export function extractEmailDomain(email: string): string {
  if (!email || !email.includes('@')) return '';
  const parts = email.trim().toLowerCase().split('@');
  return parts[1] || '';
}

/**
 * Validates whether an email is a legitimate corporate work email
 */
export function validateWorkEmail(email: string): {
  isValid: boolean;
  domain: string;
  rootDomain: string;
  error?: string;
} {
  const normalized = (email || '').trim().toLowerCase();

  if (!normalized) {
    return { isValid: false, domain: '', rootDomain: '', error: 'Email address is required.' };
  }

  // Basic RFC email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { isValid: false, domain: '', rootDomain: '', error: 'Please enter a valid email address.' };
  }

  const domain = extractEmailDomain(normalized);
  const rootDomain = extractRootDomain(domain);

  if (!domain || !domain.includes('.')) {
    return { isValid: false, domain, rootDomain, error: 'Please enter a valid company work email address.' };
  }

  // Check both full domain and root domain against consumer and disposable blocklist
  // (Prevents bypassing via subdomains e.g. user@sub.gmail.com or user@temp.mailinator.com)
  if (BLOCKED_EMAIL_DOMAINS.has(domain) || BLOCKED_EMAIL_DOMAINS.has(rootDomain)) {
    return {
      isValid: false,
      domain,
      rootDomain,
      error: "Please sign up using your company's work email address (e.g., name@yourcompany.com). Personal email providers like Gmail and Yahoo are not permitted.",
    };
  }

  return { isValid: true, domain, rootDomain };
}

/**
 * Gets the seat limit for a given plan tier
 */
export function getTierSeatLimit(tier: string | null | undefined): number {
  const cleanTier = (tier || 'free').trim().toLowerCase();
  return TIER_SEAT_LIMITS[cleanTier] || 3;
}

/**
 * Compares two tiers and returns the higher one
 */
export function getHighestTier(tierA: string, tierB: string): string {
  const rankA = TIER_HIERARCHY[tierA.toLowerCase()] || 1;
  const rankB = TIER_HIERARCHY[tierB.toLowerCase()] || 1;
  return rankA >= rankB ? tierA.toLowerCase() : tierB.toLowerCase();
}
