export type PlanTierType = 'free' | 'basic' | 'growth' | 'enterprise';
export type UserRole = 'client' | 'developer';

export interface UserAccount {
  id?: string;
  name: string;
  email: string;
  companyName: string;
  companyLogo?: string; // Base64 image data URL
  planTier: PlanTierType;
  billingCycle: 'monthly' | 'annual';
  role?: UserRole;
  createdAt: string;
}

export const STORAGE_KEY_USER = 'recovr_user_account';
export const STORAGE_KEY_USERS_DB = 'recovr_registered_users'; // Mock database of accounts
export const STORAGE_KEY_ROLE = 'recovr_active_role';
