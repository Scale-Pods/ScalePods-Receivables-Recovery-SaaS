import type { Invoice, PaymentRecord } from '../types/dashboard';

export type PeakPeriod = 'Weekly' | 'Monthly' | 'Yearly';

export interface PeakSeries {
  data: number[];
  labels: string[];
}

export interface PeriodSeries {
  openAmount: PeakSeries;
  closedAmount: PeakSeries;
  openCount: PeakSeries;
  closedCount: PeakSeries;
}

export interface ReceivableInsights {
  openAmount: number;
  openCount: number;
  closedAmount: number;
  closedCount: number;
  overdueAmount: number;
  overdueCount: number;
  dueSoonAmount: number;
  dueSoonCount: number;
  nextDueDate: string | null;
  verifiedPaymentsAmount: number;
  pendingPaymentsAmount: number;
  pendingPaymentsCount: number;
  closureRate: number;
  anchorDate: Date;
  settlementAnchorDate: Date;
  series: Record<PeakPeriod, PeriodSeries>;
  overdueSeries: Record<PeakPeriod, PeakSeries>;
  settlementSeries: Record<PeakPeriod, PeakSeries>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS: PeakPeriod[] = ['Weekly', 'Monthly', 'Yearly'];

interface Bucket {
  start: Date;
  end: Date;
  label: string;
}

interface DayBucket {
  min: number;
  max: number;
  label: string;
}

export function isClosedInvoice(invoice: Invoice): boolean {
  return invoice.status === 'paid' || invoice.currentStage === 'Done';
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function shortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(date);
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildBuckets(period: PeakPeriod, anchor: Date): Bucket[] {
  if (period === 'Weekly') {
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(anchor, index - 6);
      return { start: day, end: day, label: shortDate(day) };
    });
  }

  if (period === 'Monthly') {
    const firstDay = addDays(anchor, -29);
    return Array.from({ length: 15 }, (_, index) => {
      const start = addDays(firstDay, index * 2);
      const end = addDays(start, 1);
      return { start, end, label: shortDate(start) };
    });
  }

  const firstMonthIndex = anchor.getMonth() - 11;
  return Array.from({ length: 12 }, (_, index) => {
    const start = new Date(anchor.getFullYear(), firstMonthIndex + index, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start, end, label: monthLabel(start) };
  });
}

function bucketIndex(date: Date, buckets: Bucket[]): number {
  const time = date.getTime();
  return buckets.findIndex((bucket) => {
    const start = startOfDay(bucket.start).getTime();
    const end = startOfDay(bucket.end).getTime() + DAY_MS - 1;
    return time >= start && time <= end;
  });
}

function emptySeries(length: number): number[] {
  return Array.from({ length }, () => 0);
}

function buildPeriodSeries(invoices: Invoice[], anchor: Date, period: PeakPeriod): PeriodSeries {
  const buckets = buildBuckets(period, anchor);
  const openAmount = emptySeries(buckets.length);
  const closedAmount = emptySeries(buckets.length);
  const openCount = emptySeries(buckets.length);
  const closedCount = emptySeries(buckets.length);

  for (const invoice of invoices) {
    const dueDate = parseDate(invoice.dueDate);
    if (!dueDate) continue;
    const index = bucketIndex(dueDate, buckets);
    if (index < 0) continue;

    const amount = Number(invoice.amount) || 0;
    if (isClosedInvoice(invoice)) {
      closedAmount[index] += amount;
      closedCount[index] += 1;
    } else {
      openAmount[index] += amount;
      openCount[index] += 1;
    }
  }

  return {
    openAmount: { data: openAmount, labels: buckets.map((bucket) => bucket.label) },
    closedAmount: { data: closedAmount, labels: buckets.map((bucket) => bucket.label) },
    openCount: { data: openCount, labels: buckets.map((bucket) => bucket.label) },
    closedCount: { data: closedCount, labels: buckets.map((bucket) => bucket.label) },
  };
}

function buildDayBuckets(period: PeakPeriod): DayBucket[] {
  if (period === 'Weekly') {
    return Array.from({ length: 7 }, (_, index) => {
      const day = index + 1;
      return { min: day, max: day, label: `${day}d` };
    });
  }

  if (period === 'Monthly') {
    return Array.from({ length: 15 }, (_, index) => {
      const min = index * 2 + 1;
      return { min, max: min + 1, label: `${min}d` };
    });
  }

  return Array.from({ length: 12 }, (_, index) => {
    const min = index * 5 + 1;
    return { min, max: min + 4, label: `${min}d` };
  });
}

function buildOverdueSeries(invoices: Invoice[], today: Date, period: PeakPeriod): PeakSeries {
  const buckets = buildDayBuckets(period);
  const amounts = emptySeries(buckets.length);

  for (const invoice of invoices) {
    if (isClosedInvoice(invoice)) continue;
    const dueDate = parseDate(invoice.dueDate);
    const storedDays = invoice.daysOverdue || 0;
    const derivedDays = dueDate ? Math.round((today.getTime() - dueDate.getTime()) / DAY_MS) : 0;
    const days = Math.max(storedDays, derivedDays);
    if (days <= 0) continue;

    const index = buckets.findIndex((bucket) => days >= bucket.min && days <= bucket.max);
    if (index >= 0) amounts[index] += Number(invoice.amount) || 0;
  }

  return { data: amounts, labels: buckets.map((bucket) => bucket.label) };
}

function buildSettlementSeries(
  payments: PaymentRecord[],
  anchor: Date,
  period: PeakPeriod
): PeakSeries {
  const buckets = buildBuckets(period, anchor);
  const amounts = emptySeries(buckets.length);
  const verified = payments.filter((payment) => payment.status === 'verified');

  for (const payment of verified) {
    const settledAt = parseDate(payment.settledAt);
    if (!settledAt) continue;
    const index = bucketIndex(settledAt, buckets);
    if (index >= 0) amounts[index] += Number(payment.amount) || 0;
  }

  return { data: amounts, labels: buckets.map((bucket) => bucket.label) };
}

export function buildReceivableInsights(invoices: Invoice[], payments: PaymentRecord[]): ReceivableInsights {
  const today = startOfDay(new Date());
  const dueDates = invoices
    .map((invoice) => parseDate(invoice.dueDate))
    .filter((date): date is Date => date !== null);
  const anchor = dueDates.length > 0
    ? dueDates.reduce((latest, date) => (date.getTime() > latest.getTime() ? date : latest))
    : today;

  let openAmount = 0;
  let openCount = 0;
  let closedAmount = 0;
  let closedCount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let dueSoonAmount = 0;
  let dueSoonCount = 0;
  let nextDue: Date | null = null;

  for (const invoice of invoices) {
    const amount = Number(invoice.amount) || 0;
    const dueDate = parseDate(invoice.dueDate);

    if (isClosedInvoice(invoice)) {
      closedAmount += amount;
      closedCount += 1;
      continue;
    }

    openAmount += amount;
    openCount += 1;

    const isOverdue = (dueDate && dueDate.getTime() < today.getTime()) || (invoice.daysOverdue || 0) > 0;
    if (isOverdue) {
      overdueAmount += amount;
      overdueCount += 1;
    }

    if (dueDate) {
      const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / DAY_MS);
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        dueSoonAmount += amount;
        dueSoonCount += 1;
        if (!nextDue || dueDate.getTime() < nextDue.getTime()) nextDue = dueDate;
      }
    }
  }

  const verifiedPayments = payments.filter((payment) => payment.status === 'verified');
  const pendingPayments = payments.filter((payment) => payment.status === 'pending');
  const verifiedPaymentsAmount = verifiedPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const pendingPaymentsAmount = pendingPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const totalInvoices = openCount + closedCount;

  const settlementDates = verifiedPayments
    .map((payment) => parseDate(payment.settledAt))
    .filter((date): date is Date => date !== null);
  const settlementAnchor = settlementDates.length > 0
    ? settlementDates.reduce((latest, date) => (date.getTime() > latest.getTime() ? date : latest))
    : today;

  const series = PERIODS.reduce((acc, period) => {
    acc[period] = buildPeriodSeries(invoices, anchor, period);
    return acc;
  }, {} as Record<PeakPeriod, PeriodSeries>);

  const overdueSeries = PERIODS.reduce((acc, period) => {
    acc[period] = buildOverdueSeries(invoices, today, period);
    return acc;
  }, {} as Record<PeakPeriod, PeakSeries>);

  const settlementSeries = PERIODS.reduce((acc, period) => {
    acc[period] = buildSettlementSeries(payments, settlementAnchor, period);
    return acc;
  }, {} as Record<PeakPeriod, PeakSeries>);

  return {
    openAmount,
    openCount,
    closedAmount,
    closedCount,
    overdueAmount,
    overdueCount,
    dueSoonAmount,
    dueSoonCount,
    nextDueDate: nextDue ? isoDate(nextDue) : null,
    verifiedPaymentsAmount,
    pendingPaymentsAmount,
    pendingPaymentsCount: pendingPayments.length,
    closureRate: totalInvoices > 0 ? (closedCount / totalInvoices) * 100 : 0,
    anchorDate: anchor,
    settlementAnchorDate: settlementAnchor,
    series,
    overdueSeries,
    settlementSeries,
  };
}

export function scaleCurrencyValue(value: number): { value: number; suffix: string; decimals: number } {
  const absolute = Math.abs(value);
  if (absolute >= 10000000) {
    return { value: Number((value / 10000000).toFixed(2)), suffix: 'Cr', decimals: 2 };
  }
  if (absolute >= 100000) {
    return { value: Number((value / 100000).toFixed(2)), suffix: 'L', decimals: 2 };
  }
  if (absolute >= 1000) {
    return { value: Number((value / 1000).toFixed(0)), suffix: 'k', decimals: 0 };
  }
  return { value: Math.round(value), suffix: '', decimals: 0 };
}
