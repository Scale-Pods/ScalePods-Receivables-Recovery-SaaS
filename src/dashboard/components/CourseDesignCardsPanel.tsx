import React, { useMemo } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import Card, { type CardData } from '@/components/ui/course-design-cards';
import type { Invoice, PaymentRecord } from '../types/dashboard';
import { formatINR } from '../utils/formatters';
import { isClosedInvoice } from '../utils/peakStats';

interface CourseDesignCardsPanelProps {
  invoices: Invoice[];
  payments: PaymentRecord[];
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCardDate(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return 'No date set';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function firstDate(
  invoices: Invoice[],
  pick: (invoice: Invoice) => string | null | undefined
): string | undefined {
  return invoices
    .map(pick)
    .map((value) => parseDate(value))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0]
    ?.toISOString();
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function avatarsFor(invoices: Invoice[]) {
  const top = [...invoices]
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 2);

  return {
    imgSrc1: top[0]?.avatarUrl,
    imgAlt1: top[0]?.customerName,
    avatarInitials1: top[0] ? initials(top[0].customerName) : undefined,
    imgSrc2: top[1]?.avatarUrl,
    imgAlt2: top[1]?.customerName,
    avatarInitials2: top[1] ? initials(top[1].customerName) : undefined,
  };
}

function sumAmount(invoices: Invoice[]): number {
  return invoices.reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
}

function share(part: number, total: number): string {
  return `${(total > 0 ? (part / total) * 100 : 0).toFixed(1)}%`;
}

export function CourseDesignCardsPanel({ invoices, payments }: CourseDesignCardsPanelProps) {
  const cards = useMemo<CardData[]>(() => {
    const activeInvoices = invoices.filter((invoice) => !isClosedInvoice(invoice));
    const activeTotal = activeInvoices.length;

    const promisedInvoices = activeInvoices.filter(
      (invoice) => invoice.status === 'promise' || Boolean(invoice.promisedDate)
    );
    const flaggedInvoices = activeInvoices.filter(
      (invoice) => invoice.hasDispute || invoice.hasTicket
    );

    const pendingPaymentKeys = new Set(
      payments
        .filter((payment) => payment.status === 'pending')
        .flatMap((payment) => [payment.invoiceId, payment.invoiceNumber])
        .filter(Boolean)
    );
    const proofReviewInvoices = activeInvoices.filter(
      (invoice) =>
        invoice.hasProofFile ||
        pendingPaymentKeys.has(invoice.id) ||
        pendingPaymentKeys.has(invoice.invoiceNumber)
    );

    const stageOrder: Invoice['currentStage'][] = [
      'Executive/Legal Hold',
      'Executive Hold',
      'Escalation',
      'Firm',
      'Friendly',
    ];
    const targetStage =
      stageOrder.find((stage) => activeInvoices.some((invoice) => invoice.currentStage === stage)) ??
      'Friendly';
    const stageInvoices = activeInvoices.filter((invoice) => invoice.currentStage === targetStage);

    return [
      {
        id: 1,
        colorClass: 'recovr-purple',
        date: formatCardDate(firstDate(promisedInvoices, (invoice) => invoice.promisedDate)),
        title: 'Promise tracker',
        description: `${formatINR(sumAmount(promisedInvoices), { compact: true })} across ${promisedInvoices.length} customer promise${promisedInvoices.length === 1 ? '' : 's'}`,
        progressPercent: share(promisedInvoices.length, activeTotal),
        progressValue: `${promisedInvoices.length}/${activeTotal}`,
        countdownText: `${promisedInvoices.length} tracked`,
        infoText: "Source: invoice.status = 'promise' and promisedDate on active invoices in the logged-in account's ledger. Excludes paid and Done invoices.",
        ...avatarsFor(promisedInvoices),
      },
      {
        id: 2,
        colorClass: 'recovr-orange',
        date: formatCardDate(firstDate(flaggedInvoices, (invoice) => invoice.dueDate)),
        title: 'Disputes & tickets',
        description: `${formatINR(sumAmount(flaggedInvoices), { compact: true })} across ${flaggedInvoices.length} flagged account${flaggedInvoices.length === 1 ? '' : 's'}`,
        progressPercent: share(flaggedInvoices.length, activeTotal),
        progressValue: `${flaggedInvoices.length}/${activeTotal}`,
        countdownText: `${flaggedInvoices.length} flagged`,
        infoText: 'Source: hasDispute and hasTicket flags on active ledger invoices. Each flagged invoice is counted once, even when both flags are present.',
        ...avatarsFor(flaggedInvoices),
      },
      {
        id: 3,
        colorClass: 'recovr-blue',
        date: formatCardDate(
          firstDate(proofReviewInvoices, (invoice) => invoice.proofFile?.uploadDate ?? invoice.dueDate)
        ),
        title: 'Proof verification',
        description: `${formatINR(sumAmount(proofReviewInvoices), { compact: true })} awaiting review across ${proofReviewInvoices.length} case${proofReviewInvoices.length === 1 ? '' : 's'}`,
        progressPercent: share(proofReviewInvoices.length, activeTotal),
        progressValue: `${proofReviewInvoices.length}/${activeTotal}`,
        countdownText: `${proofReviewInvoices.length} reviews`,
        infoText: "Source: invoice.hasProofFile plus payment records with status = 'pending'. Invoices are de-duplicated by invoice id/number before counting.",
        ...avatarsFor(proofReviewInvoices),
      },
      {
        id: 4,
        colorClass: 'recovr-slate',
        date: formatCardDate(firstDate(stageInvoices, (invoice) => invoice.dueDate)),
        title: 'Cadence stage',
        description: `${formatINR(sumAmount(stageInvoices), { compact: true })} in ${targetStage} — the most advanced active stage`,
        progressPercent: share(stageInvoices.length, activeTotal),
        progressValue: `${stageInvoices.length}/${activeTotal}`,
        countdownText: `${stageInvoices.length} in cadence`,
        infoText: 'Source: currentStage on active recovery invoices. The card highlights the most advanced stage with work still open, so it does not repeat the paid/closed totals above.',
        ...avatarsFor(stageInvoices),
      },
    ];
  }, [invoices, payments]);

  const queueCount = cards.length;
  const activeCount = invoices.filter((invoice) => !isClosedInvoice(invoice)).length;

  return (
    <section aria-label="Recovery action queues" className="dashboard-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            Workflow signals
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            Action queues
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Work that needs attention from the live ledger and payment proofs. No financial totals are repeated from the KPI cards above.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <CalendarClock className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
            <span className="font-semibold text-slate-900 dark:text-white">{queueCount}</span> live queues
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">{activeCount}</span> active invoices
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.id} data={card} />
        ))}
      </div>
    </section>
  );
}

export default CourseDesignCardsPanel;
