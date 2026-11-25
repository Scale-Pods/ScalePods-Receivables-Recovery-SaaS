import { pricingPlans, type PricingPlan } from '../data/landingData';
import type { PlanTierType } from '../types/auth';

export type PlanTier = PlanTierType;

/**
 * Server-provided projection of public.recovery_plan_limits.
 * `Price_monthly`, `Price_yearly` and `Sequence` are intentionally only read
 * through /api/plan-limits; this module never queries or writes the table.
 */
export interface PlanLimitRow {
  id: number;
  plan_name: string;
  max_invoices_per_month?: number | null;
  max_ai_call_minutes?: number | null;
  email_enabled?: boolean | null;
  whatsapp_enabled?: boolean | null;
  ai_calls_enabled?: boolean | null;
  manual_upload_enabled?: boolean | null;
  bulk_upload_enabled?: boolean | null;
  email_forwarding_enabled?: boolean | null;
  max_invoicing_connections?: number | null;
  light_sequence_enabled?: boolean | null;
  standard_sequence_enabled?: boolean | null;
  intensive_sequence_enabled?: boolean | null;
  editable_sequence_enabled?: boolean | null;
  max_sequence_days?: number | null;
  ai_bucket_selection?: boolean | null;
  advanced_risk_scoring?: boolean | null;
  ai_risk_weighting?: boolean | null;
  ai_reply_analysis?: boolean | null;
  promise_capture?: boolean | null;
  ai_next_step?: boolean | null;
  ai_payment_plans?: boolean | null;
  ai_best_time_channel?: boolean | null;
  dispute_tracking?: boolean | null;
  auto_dispute_extension?: boolean | null;
  credit_hold?: boolean | null;
  team_alerts?: boolean | null;
  lawyer_handoff?: boolean | null;
  late_interest_claim?: boolean | null;
  international_payments?: boolean | null;
  invoice_grouping?: boolean | null;
  instalments_enabled?: boolean | null;
  multiple_bank_accounts?: boolean | null;
  bulk_payment_marking?: boolean | null;
  custom_payment_gateways?: boolean | null;
  history_months?: number | null;
  allowed_channels?: string[] | null;
  allowed_sequence_types?: string[] | null;
  payment_methods?: string[] | null;
  custom_limits?: Record<string, unknown> | string | null;
  status?: string | null;
  Sequence?: string | null;
  Price_monthly?: string | null;
  Price_yearly?: string | null;
  [key: string]: unknown;
}

export interface PlanEntitlement {
  id: PlanTier;
  name: string;
  badge: string;
  isPopular?: boolean;
  isCustomPrice?: boolean;
  monthlyPrice: number;
  annualPrice: number;
  period: string;
  invoiceQuota: string;
  channels: string;
  callMinutes: string;
  sequences: string;
  aiFeatures: string;
  priceLabel?: string;
}

export interface DynamicPlanQuota {
  invoiceLimit?: number;
  voiceMinutesLimit?: number;
  isCustom?: boolean;
}

export interface ResolvedPlanPricing {
  /** From Price_monthly, billed per month. */
  monthlyPriceINR: number;
  /** From Price_yearly, total amount billed per year. */
  annualPriceINR: number;
  isCustomPrice: boolean;
  priceLabel: string;
}

const TIERS: PlanTier[] = ['free', 'basic', 'growth', 'enterprise'];
const CACHE_TTL_MS = 30 * 1000;
let cache: { rows: PlanLimitRow[]; expiresAt: number } | null = null;

/** Fallbacks are used only if /api/plan-limits is unavailable. */
export const fallbackEntitlements: PlanEntitlement[] = [
  {
    id: 'free',
    name: 'Free',
    badge: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    period: 'forever',
    invoiceQuota: '10 invoices / mo',
    channels: 'Email only',
    callMinutes: 'None',
    sequences: 'Light only (Day 1)',
    aiFeatures: 'Invoice reading & templates',
  },
  {
    id: 'basic',
    name: 'Basic',
    badge: 'Test Plan (₹1)',
    monthlyPrice: 1,
    annualPrice: 1,
    period: 'per month',
    invoiceQuota: '50 invoices / mo',
    channels: 'Email, WhatsApp',
    callMinutes: 'None',
    sequences: 'Light & Standard, tone choice',
    aiFeatures: 'Adds message writing in business tone',
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'Most Popular',
    isPopular: true,
    monthlyPrice: 7999,
    annualPrice: 6399,
    period: 'per month',
    invoiceQuota: '300 invoices / mo',
    channels: 'Email, WhatsApp, AI Voice Calls',
    callMinutes: '90 AI voice mins / mo',
    sequences: 'Light, Standard, Intensive + 21-Day editor',
    aiFeatures: 'Reply reading, promise capture, multi-lingual',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Autonomous',
    isCustomPrice: true,
    monthlyPrice: 0,
    annualPrice: 0,
    period: 'contract',
    invoiceQuota: 'Unlimited volume',
    channels: 'All + Dedicated WhatsApp & Custom Voice',
    callMinutes: 'Custom / Pooled quota',
    sequences: 'Custom sequences of any length (7-90+ days)',
    aiFeatures: 'AI-agreed payment plans, self-improving timing',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[₹,\s]/g, '');
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function readNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function parseCustomLimits(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeTier(value: unknown): PlanTier | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normalized) return null;
  if (normalized.includes('enterprise')) return 'enterprise';
  if (normalized.includes('growth') || normalized.includes('pro')) return 'growth';
  if (normalized.includes('basic') || normalized.includes('starter')) return 'basic';
  if (normalized.includes('free')) return 'free';
  return TIERS.find((tier) => normalized === tier) ?? null;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function parsePriceValue(
  raw: unknown,
  custom: Record<string, unknown>,
  customKeys: string[]
): { amount: number | null; isCustom: boolean } {
  const text = raw === null || raw === undefined ? '' : String(raw).trim();

  if (/\b(custom|contact|sales|talk to)\b/i.test(text)) {
    return { amount: null, isCustom: true };
  }

  const amount = toNumber(text);
  if (amount !== null) return { amount, isCustom: false };

  const customAmount = readNumber(custom, customKeys);
  if (customAmount !== null) return { amount: customAmount, isCustom: false };

  if (custom.isCustomPrice === true || custom.customPrice === true) {
    return { amount: null, isCustom: true };
  }

  return { amount: null, isCustom: false };
}

export function resolvePlanPricing(row: PlanLimitRow): ResolvedPlanPricing {
  const custom = parseCustomLimits(row.custom_limits);
  const monthlyInfo = parsePriceValue(row.Price_monthly, custom, [
    'monthlyPriceINR',
    'monthlyPrice',
    'monthly_price',
  ]);
  const yearlyInfo = parsePriceValue(row.Price_yearly, custom, [
    'annualPriceINR',
    'annualPricePerMonthINR',
    'annualPrice',
    'annual_price',
    'yearlyPriceINR',
    'yearly_price',
  ]);

  const noDbPrice = monthlyInfo.amount === null && yearlyInfo.amount === null;
  // Never invent prices from static fallback data when the DB row has no price.
  const isCustomPrice = monthlyInfo.isCustom || yearlyInfo.isCustom || noDbPrice;

  let monthlyPriceINR = monthlyInfo.amount;
  let annualPriceINR = yearlyInfo.amount;

  if (!isCustomPrice) {
    // If only one column is populated, derive the other without inventing a discount.
    if (monthlyPriceINR === null && annualPriceINR !== null) {
      monthlyPriceINR = Math.round(annualPriceINR / 12);
    }
    if (annualPriceINR === null && monthlyPriceINR !== null) {
      annualPriceINR = monthlyPriceINR * 12;
    }
  }

  const resolvedMonthly = isCustomPrice ? 0 : monthlyPriceINR ?? 0;
  const resolvedAnnual = isCustomPrice ? 0 : annualPriceINR ?? 0;

  return {
    monthlyPriceINR: resolvedMonthly,
    annualPriceINR: resolvedAnnual,
    isCustomPrice,
    priceLabel: isCustomPrice
      ? 'Custom'
      : resolvedMonthly === 0 && resolvedAnnual === 0
      ? '₹0'
      : formatINR(resolvedMonthly),
  };
}

function indexRows(rows: PlanLimitRow[]): Map<PlanTier, PlanLimitRow> {
  const indexed = new Map<PlanTier, PlanLimitRow>();
  for (const row of rows) {
    const tier = normalizeTier(row.plan_name);
    if (tier && !indexed.has(tier)) indexed.set(tier, row);
  }
  return indexed;
}

export function getPlanRow(rows: PlanLimitRow[], tier: PlanTier): PlanLimitRow | undefined {
  return indexRows(rows).get(tier);
}

function replaceFeature(features: string[], pattern: RegExp, replacement: string): string[] {
  const index = features.findIndex((feature) => pattern.test(feature));
  if (index === -1) return [...features, replacement];
  const next = [...features];
  next[index] = replacement;
  return next;
}

function buildPricingFeatures(row: PlanLimitRow, fallback: PricingPlan): string[] {
  let features = [...fallback.features];

  const invoices = toNumber(row.max_invoices_per_month);
  if (invoices !== null) {
    const label =
      invoices >= 99999
        ? 'Unlimited invoices entering recovery'
        : `Up to ${invoices} invoices in recovery / month`;
    features = replaceFeature(features, /invoice/i, label);
  }

  const minutes = toNumber(row.max_ai_call_minutes);
  if (minutes !== null) {
    features =
      minutes === 0
        ? features.filter((feature) => !/AI call|voice|minutes/i.test(feature))
        : replaceFeature(features, /AI call|voice|minutes/i, `${minutes} AI call minutes included / month`);
  }

  const history = toNumber(row.history_months);
  if (history !== null) {
    features = replaceFeature(features, /history/i, `${history}-month history & key metrics`);
  }

  if (row.whatsapp_enabled === false) {
    features = features.filter((feature) => !/whatsapp/i.test(feature));
  }
  if (row.bulk_upload_enabled === false) {
    features = features.filter((feature) => !/bulk upload/i.test(feature));
  }

  return features;
}

export function buildPricingPlans(rows: PlanLimitRow[]): PricingPlan[] {
  const indexed = indexRows(rows);
  return pricingPlans.map((fallback) => {
    const row = indexed.get(fallback.id as PlanTier);
    if (!row) return fallback;

    const pricing = resolvePlanPricing(row);
    const planName =
      typeof row.plan_name === 'string' && row.plan_name.trim() ? row.plan_name.trim() : fallback.name;

    return {
      ...fallback,
      name: planName,
      monthlyPriceINR: pricing.monthlyPriceINR,
      annualPriceINR: pricing.annualPriceINR,
      isCustomPrice: pricing.isCustomPrice,
      priceLabel: pricing.priceLabel,
      features: buildPricingFeatures(row, fallback),
    };
  });
}

function asStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const values = value.map((item) => String(item).trim()).filter(Boolean);
    return values.length ? values : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const values = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return values.length ? values : null;
  }
  return null;
}

function friendlyChannel(value: string): string {
  const key = value.toLowerCase();
  if (key.includes('whatsapp')) return 'WhatsApp';
  if (key.includes('voice') || key.includes('call')) return 'AI Voice Calls';
  if (key.includes('email') || key.includes('mail')) return 'Email';
  if (key.includes('sms')) return 'SMS';
  if (key.includes('portal')) return 'Portal';
  return value;
}

function deriveChannels(row: PlanLimitRow, fallback: string): string {
  const configured = asStringArray(row.allowed_channels);
  if (configured) return configured.map(friendlyChannel).join(', ');

  const channels: string[] = [];
  if (row.email_enabled !== false) channels.push('Email');
  if (row.whatsapp_enabled === true) channels.push('WhatsApp');
  if (row.ai_calls_enabled === true) channels.push('AI Voice Calls');
  return channels.length ? channels.join(', ') : fallback;
}

function deriveSequences(row: PlanLimitRow, fallback: string): string {
  const configured = asStringArray(row.allowed_sequence_types);
  const enabled: string[] = [];

  if (row.light_sequence_enabled === true) enabled.push('Light');
  if (row.standard_sequence_enabled === true) enabled.push('Standard');
  if (row.intensive_sequence_enabled === true) enabled.push('Intensive');
  if (row.editable_sequence_enabled === true) enabled.push('Editor');
  if (configured) enabled.push(...configured);

  const unique = Array.from(new Set(enabled));
  let label = unique.length ? unique.join(', ') : fallback;
  const days = toNumber(row.max_sequence_days);
  if (days !== null) label += ` (${days}-day cap)`;
  return label;
}

function deriveAiFeatures(row: PlanLimitRow, fallback: string): string {
  const flags: Array<[unknown, string]> = [
    [row.ai_reply_analysis, 'AI reply reading'],
    [row.advanced_risk_scoring, 'Advanced risk scoring'],
    [row.ai_risk_weighting, 'AI risk weighting'],
    [row.promise_capture, 'Promise capture'],
    [row.ai_next_step, 'AI next-step'],
    [row.ai_payment_plans, 'AI payment plans'],
    [row.ai_best_time_channel, 'Best time/channel'],
  ];
  const enabled = flags.filter(([flag]) => flag === true).map(([, label]) => label);
  return enabled.length ? enabled.join(', ') : fallback;
}

function deriveInvoiceQuota(row: PlanLimitRow, custom: Record<string, unknown>, fallback: string): string {
  if (typeof custom.invoiceQuota === 'string' && custom.invoiceQuota.trim()) return custom.invoiceQuota;
  if (custom.unlimited === true) return 'Unlimited volume';
  const invoices = toNumber(row.max_invoices_per_month);
  if (invoices === null) return fallback;
  if (invoices >= 99999) return 'Unlimited volume';
  return `${invoices} invoices / mo`;
}

function deriveBadge(fallback: PlanEntitlement, pricing: ResolvedPlanPricing): string {
  if (pricing.isCustomPrice) return 'Custom Contract';
  if (pricing.monthlyPriceINR === 1) return 'Test Plan (₹1)';
  if (fallback.isPopular) return 'Most Popular';
  if (pricing.monthlyPriceINR === 0) return 'Free Forever';
  if (fallback.badge.startsWith('Test Plan')) return 'Entry Plan';
  return fallback.badge;
}

export function buildEntitlements(rows: PlanLimitRow[]): PlanEntitlement[] {
  const indexed = indexRows(rows);
  return fallbackEntitlements.map((fallback) => {
    const row = indexed.get(fallback.id);
    if (!row) return fallback;

    const custom = parseCustomLimits(row.custom_limits);
    const pricing = resolvePlanPricing(row);
    const minutes = toNumber(row.max_ai_call_minutes);
    const planName =
      typeof row.plan_name === 'string' && row.plan_name.trim() ? row.plan_name.trim() : fallback.name;

    return {
      ...fallback,
      name: planName,
      badge: deriveBadge(fallback, pricing),
      isCustomPrice: pricing.isCustomPrice,
      monthlyPrice: pricing.monthlyPriceINR,
      annualPrice: pricing.annualPriceINR,
      priceLabel: pricing.priceLabel,
      period: pricing.isCustomPrice ? 'contract' : fallback.period,
      invoiceQuota: deriveInvoiceQuota(row, custom, fallback.invoiceQuota),
      channels: deriveChannels(row, fallback.channels),
      callMinutes:
        minutes === null
          ? fallback.callMinutes
          : minutes === 0
          ? 'None'
          : `${minutes} AI voice mins / mo`,
      sequences: deriveSequences(row, fallback.sequences),
      aiFeatures: deriveAiFeatures(row, fallback.aiFeatures),
    };
  });
}

export function buildQuotaMap(rows: PlanLimitRow[]): Partial<Record<PlanTier, DynamicPlanQuota>> {
  const quotas: Partial<Record<PlanTier, DynamicPlanQuota>> = {};
  for (const row of rows) {
    const tier = normalizeTier(row.plan_name);
    if (!tier) continue;

    const custom = parseCustomLimits(row.custom_limits);
    const invoiceLimit = toNumber(row.max_invoices_per_month) ?? undefined;
    const voiceMinutesLimit = toNumber(row.max_ai_call_minutes) ?? undefined;
    const unlimited = custom.unlimited === true || custom.isCustom === true;

    quotas[tier] = {
      invoiceLimit: unlimited ? 99999 : invoiceLimit,
      voiceMinutesLimit: unlimited ? 99999 : voiceMinutesLimit,
      isCustom: unlimited || (tier === 'enterprise' && !invoiceLimit && !voiceMinutesLimit),
    };
  }
  return quotas;
}

/**
 * Read plan rows from the server endpoint only. Never query Supabase from the
 * browser for pricing: the Price column is served exclusively by this route.
 */
export async function fetchPlanLimits(forceRefresh = false): Promise<PlanLimitRow[]> {
  if (!forceRefresh && cache && Date.now() < cache.expiresAt) return cache.rows;
  if (forceRefresh) cache = null;

  try {
    const response = await fetch(`/api/plan-limits?t=${Date.now()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`Plan pricing request failed (${response.status})`);

    const payload = (await response.json()) as { data?: PlanLimitRow[] };
    const rows = Array.isArray(payload?.data)
      ? payload.data.filter((row) => !row.status || String(row.status).toLowerCase() === 'active')
      : [];

    if (rows.length) {
      cache = { rows, expiresAt: Date.now() + CACHE_TTL_MS };
    }
    return rows;
  } catch (error) {
    console.warn('Unable to load plan pricing from recovery_plan_limits.', error);
    // Never fall back to stale/cached prices: the DB is the only source of truth.
    return [];
  }
}

export function clearPlanLimitsCache(): void {
  cache = null;
}
