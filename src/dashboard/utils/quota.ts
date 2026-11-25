import { PlanTier } from '../types/dashboard';
import type { DynamicPlanQuota } from '../../lib/planLimits';

export interface PlanQuota {
  invoiceLimit: number;
  voiceMinutesLimit: number;
  isCustom?: boolean;
}

export const TIER_QUOTAS: Record<PlanTier, PlanQuota> = {
  free: {
    invoiceLimit: 10,
    voiceMinutesLimit: 0,
  },
  basic: {
    invoiceLimit: 50,
    voiceMinutesLimit: 0,
  },
  growth: {
    invoiceLimit: 300,
    voiceMinutesLimit: 90,
  },
  enterprise: {
    invoiceLimit: 5000,
    voiceMinutesLimit: 600,
    isCustom: true,
  },
};

export interface TopUpState {
  extraInvoices: number;
  extraMinutes: number;
}

export interface QuotaUsage {
  invoicesUsed: number;
  invoiceLimit: number;
  invoicesRemaining: number;
  voiceMinutesUsed: number;
  voiceMinutesLimit: number;
  voiceMinutesRemaining: number;
  isInvoiceLimitReached: boolean;
  isVoiceLimitReached: boolean;
  invoicePercent: number;
  voicePercent: number;
  isCustom: boolean;
}

export function calculateQuotaUsage(
  planTier: PlanTier,
  invoicesCount: number,
  voiceMinutesUsed: number,
  topUp: TopUpState = { extraInvoices: 0, extraMinutes: 0 },
  dynamicQuota?: DynamicPlanQuota | null
): QuotaUsage {
  const fallback = TIER_QUOTAS[planTier] || TIER_QUOTAS.free;
  const base: PlanQuota = {
    invoiceLimit: dynamicQuota?.invoiceLimit ?? fallback.invoiceLimit,
    voiceMinutesLimit: dynamicQuota?.voiceMinutesLimit ?? fallback.voiceMinutesLimit,
    isCustom: dynamicQuota?.isCustom ?? fallback.isCustom,
  };
  const isCustom = Boolean(base.isCustom);

  const invoiceLimit = isCustom ? 99999 : base.invoiceLimit + (topUp.extraInvoices || 0);
  const voiceMinutesLimit = isCustom ? 99999 : base.voiceMinutesLimit + (topUp.extraMinutes || 0);

  const invoicesUsed = invoicesCount;
  const invoicesRemaining = isCustom ? 99999 : Math.max(0, invoiceLimit - invoicesUsed);
  const isInvoiceLimitReached = !isCustom && invoicesUsed >= invoiceLimit;

  const invoicePercent = isCustom 
    ? 0 
    : Math.min(100, Math.round((invoicesUsed / Math.max(1, invoiceLimit)) * 100));

  const voicePercent = isCustom || voiceMinutesLimit === 0
    ? 0
    : Math.min(100, Math.round((voiceMinutesUsed / Math.max(1, voiceMinutesLimit)) * 100));

  const voiceMinutesRemaining = isCustom
    ? 99999
    : Math.max(0, voiceMinutesLimit - voiceMinutesUsed);

  const isVoiceLimitReached = !isCustom && voiceMinutesLimit > 0 && voiceMinutesUsed >= voiceMinutesLimit;

  return {
    invoicesUsed,
    invoiceLimit,
    invoicesRemaining,
    voiceMinutesUsed,
    voiceMinutesLimit,
    voiceMinutesRemaining,
    isInvoiceLimitReached,
    isVoiceLimitReached,
    invoicePercent,
    voicePercent,
    isCustom,
  };
}
