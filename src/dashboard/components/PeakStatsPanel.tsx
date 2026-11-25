import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, ShieldCheck } from 'lucide-react';
import PeakChart from '@/components/ui/peak-chart';
import type { Invoice, PaymentRecord } from '../types/dashboard';
import { formatINR } from '../utils/formatters';
import {
  buildReceivableInsights,
  scaleCurrencyValue,
  type PeakPeriod,
  type PeakSeries,
} from '../utils/peakStats';

interface PeakStatsPanelProps {
  invoices: Invoice[];
  payments: PaymentRecord[];
}

const PERIODS = ['Weekly', 'Monthly', 'Yearly'];

function formatAnchorLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date);
}

function formatNextDue(label: string | null): string {
  if (!label) return 'No future dues';
  const [year, month, day] = label.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(
    new Date(year, month - 1, day)
  );
}

function peakBucket(series: PeakSeries): { amount: number; label: string } {
  const amount = Math.max(0, ...series.data);
  const index = series.data.indexOf(amount);
  return { amount, label: series.labels[index] ?? 'No data' };
}

/** Graph readouts never show more than two decimal places. */
function formatGraphValue(value: number): string {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return formatINR(rounded, { compact: true });
}

export function PeakStatsPanel({ invoices, payments }: PeakStatsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(320);
  const [period, setPeriod] = useState<PeakPeriod>('Monthly');

  useEffect(() => {
    const updateWidth = () => {
      const containerWidth = containerRef.current?.clientWidth ?? Math.max(240, window.innerWidth - 64);
      const fourUp = containerWidth >= 900;
      const twoUp = containerWidth >= 560;
      const nextWidth = fourUp
        ? Math.min((containerWidth - 60) / 4, 360)
        : twoUp
        ? Math.min((containerWidth - 20) / 2, 360)
        : Math.min(containerWidth, 420);
      setChartWidth(Math.max(180, Math.round(nextWidth)));
    };

    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const insights = useMemo(
    () => buildReceivableInsights(invoices, payments),
    [invoices, payments]
  );

  const currentSeries = insights.series[period];
  const currentOverdueSeries = insights.overdueSeries[period];
  const currentSettlementSeries = insights.settlementSeries[period];

  const openPeak = peakBucket(currentSeries.openAmount);
  const closedPeak = peakBucket(currentSeries.closedAmount);
  const overduePeak = peakBucket(currentOverdueSeries);
  const settlementPeak = peakBucket(currentSettlementSeries);

  const openScale = scaleCurrencyValue(openPeak.amount);
  const closedScale = scaleCurrencyValue(closedPeak.amount);
  const overdueScale = scaleCurrencyValue(overduePeak.amount);
  const settlementScale = scaleCurrencyValue(settlementPeak.amount);

  const anchorLabel = formatAnchorLabel(insights.anchorDate);
  const settlementAnchorLabel = formatAnchorLabel(insights.settlementAnchorDate);
  const periodLabel = period.toLowerCase();

  return (
    <section
      aria-label="Due date and recovery distribution"
      className="dashboard-card relative overflow-hidden p-4 sm:p-5"
    >
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Receivable intelligence
          </div>
          <h2
            className="mt-2 bg-none text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl"
            style={{ WebkitTextFillColor: 'currentColor' }}
          >
            Due-date &amp; recovery pulse
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Distribution-only view: each headline is the largest single bucket in the selected window, not a repeat of the portfolio totals shown above.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <CalendarClock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-300" />
            Next due <span className="font-semibold text-slate-900 dark:text-white">{formatNextDue(insights.nextDueDate)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            Anchored <span className="font-semibold text-slate-900 dark:text-white">{anchorLabel}</span>
          </span>
        </div>
      </div>

      <div ref={containerRef} className="relative mt-5 grid grid-cols-1 justify-items-center gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <PeakChart
          width={chartWidth}
          accent="#8b80c4"
          period={period}
          periods={PERIODS}
          onPeriodChange={(next) => setPeriod(next as PeakPeriod)}
          data={currentSeries.openAmount.data}
          labels={currentSeries.openAmount.labels}
          value={openScale.value}
          valueSuffix={openScale.suffix}
          decimals={openScale.decimals}
          title="Peak due-date bucket"
          caption={`${openPeak.label} · ${insights.openCount} open invoices`}
          updatedText={`Due-date view · ${anchorLabel}`}
          infoText={`Source: invoice due dates from the logged-in account's ledger. Headline is the largest single ${periodLabel} bucket of open invoice value, not the outstanding total shown above.`}
          trend="none"
          formatValue={formatGraphValue}
        />
        <PeakChart
          width={chartWidth}
          accent="#8b80c4"
          period={period}
          periods={PERIODS}
          onPeriodChange={(next) => setPeriod(next as PeakPeriod)}
          data={currentSeries.closedAmount.data}
          labels={currentSeries.closedAmount.labels}
          value={closedScale.value}
          valueSuffix={closedScale.suffix}
          decimals={closedScale.decimals}
          title="Peak cleared bucket"
          caption={`${closedPeak.label} · ${insights.closedCount} closed invoices`}
          updatedText={`Closed by due date · ${anchorLabel}`}
          infoText={`Source: invoices marked paid or Done, grouped by their original due date. Headline is the largest single ${periodLabel} bucket of closed invoice value, not the closed total shown above.`}
          trend={insights.closedAmount > 0 ? 'up' : 'none'}
          formatValue={formatGraphValue}
        />
        <PeakChart
          width={chartWidth}
          accent="#8b80c4"
          period={period}
          periods={PERIODS}
          onPeriodChange={(next) => setPeriod(next as PeakPeriod)}
          data={currentOverdueSeries.data}
          labels={currentOverdueSeries.labels}
          value={overdueScale.value}
          valueSuffix={overdueScale.suffix}
          decimals={overdueScale.decimals}
          title="Peak overdue band"
          caption={`${overduePeak.label} overdue · ${insights.overdueCount} invoices`}
          updatedText="Amount by days overdue"
          infoText={`Source: due date and daysOverdue on active ledger invoices. Headline is the largest ${periodLabel} ageing band; the overdue total is shown in the KPI card above.`}
          trend="none"
          formatValue={formatGraphValue}
        />
        <PeakChart
          width={chartWidth}
          accent="#8b80c4"
          period={period}
          periods={PERIODS}
          onPeriodChange={(next) => setPeriod(next as PeakPeriod)}
          data={currentSettlementSeries.data}
          labels={currentSettlementSeries.labels}
          value={settlementScale.value}
          valueSuffix={settlementScale.suffix}
          decimals={settlementScale.decimals}
          title="Peak settlement day"
          caption={`${settlementPeak.label} · ${insights.pendingPaymentsCount} proofs pending`}
          updatedText={`Settled by date · ${settlementAnchorLabel}`}
          infoText={`Source: payment records with status = verified and their settledAt date. Headline is the largest ${periodLabel} settlement bucket; pending proofs are counted separately.`}
          trend={insights.verifiedPaymentsAmount > 0 ? 'up' : 'none'}
          formatValue={formatGraphValue}
        />
      </div>
    </section>
  );
}

export default PeakStatsPanel;
