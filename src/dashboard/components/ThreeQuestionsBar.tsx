import React, { useEffect, useState } from 'react';
import {
  IndianRupee,
  Users,
  ArrowUpRight,
  Activity,
  TrendingUp,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from 'lucide-react';
import { InfoHint } from '@/components/ui/info-hint';
import { formatINR } from '../utils/formatters';
import { Invoice, PaymentRecord } from '../types/dashboard';
import '../stats-carousel.css';

interface ThreeQuestionsBarProps {
  totalOwed: number;
  totalOverdue: number;
  totalRecovered: number;
  activeWorkflowsCount: number;
  touchesTodayCount: number;
  pendingOwnerItemsCount: number;
  invoices: Invoice[];
  payments: PaymentRecord[];
  onViewLedger: () => void;
  onViewChannels: () => void;
  onScrollToFocus: () => void;
}

type StatTone = 'slate' | 'indigo' | 'amber';

interface StatSlide {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  footer: React.ReactNode;
  /** Source note shown in the small `i` tooltip beside the slide icon. */
  infoText: string;
}

interface RotatingStatCardProps {
  slides: StatSlide[];
  tone: StatTone;
  cardClassName: string;
  onClick: () => void;
}

const toneStyles: Record<StatTone, { icon: string; label: string; value: string; dot: string; accent: string }> = {
  slate: {
    icon: 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400',
    label: 'text-zinc-500 dark:text-zinc-400',
    value: 'text-zinc-900 dark:text-white',
    dot: 'bg-zinc-500 dark:bg-zinc-300',
    accent: 'slate',
  },
  indigo: {
    icon: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
    label: 'text-zinc-500 dark:text-zinc-400',
    value: 'text-zinc-900 dark:text-white',
    dot: 'bg-indigo-500',
    accent: 'indigo',
  },
  amber: {
    icon: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    label: 'text-amber-800 dark:text-amber-500',
    value: 'text-amber-800 dark:text-amber-500',
    dot: 'bg-amber-500',
    accent: 'amber',
  },
};

const neutralChip =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300';
const amberChip =
  'px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950/60 font-semibold flex items-center gap-1 border border-amber-300/60 dark:border-amber-800/60';

const RotatingStatCard: React.FC<RotatingStatCardProps> = ({ slides, tone, cardClassName, onClick }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const toneStyle = toneStyles[tone];

  useEffect(() => {
    if (isPaused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isPaused, slides.length]);

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false);
      }}
      data-accent={toneStyle.accent}
      className={`dashboard-card group relative h-[188px] cursor-pointer p-5 ${cardClassName}`}
    >
      <div className="stat-carousel-viewport">
        <div className="stat-carousel-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
          {slides.map((slide, index) => (
            <div
              key={`${slide.label}-${index}`}
              className="stat-carousel-slide"
              aria-hidden={index !== activeIndex}
            >
              <div>
                <div className={`text-xs uppercase tracking-wider font-semibold mb-1.5 flex items-center justify-between gap-2 ${toneStyle.label}`}>
                  <span>{slide.label}</span>
                  <span className="flex items-center gap-2">
                    <InfoHint text={slide.infoText} />
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${toneStyle.icon}`}>
                      {slide.icon}
                    </span>
                  </span>
                </div>
                <div className={`text-3xl sm:text-4xl font-bold tracking-tight font-mono tabular-nums ${toneStyle.value}`}>
                  {slide.value}
                </div>
              </div>

              <div className="pt-3 pb-4">{slide.footer}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1" aria-hidden="true">
        {slides.map((_, index) => (
          <span
            key={index}
            className={`h-1 rounded-full transition-all duration-300 ${
              index === activeIndex ? `w-4 ${toneStyle.dot}` : 'w-1 bg-zinc-300 dark:bg-zinc-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export const ThreeQuestionsBar: React.FC<ThreeQuestionsBarProps> = ({
  totalOwed,
  totalOverdue,
  totalRecovered,
  activeWorkflowsCount,
  touchesTodayCount,
  pendingOwnerItemsCount,
  invoices,
  payments,
  onViewLedger,
  onViewChannels,
  onScrollToFocus,
}) => {
  const activeInvoices = invoices.filter(
    (invoice) => invoice.status !== 'paid' && invoice.currentStage !== 'Done'
  );
  const overdueInvoices = activeInvoices.filter((invoice) => invoice.daysOverdue > 0);
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
  const averageActiveInvoice = activeInvoices.length > 0 ? totalOwed / activeInvoices.length : 0;
  const largestOverdue = overdueInvoices.reduce((largest, invoice) => Math.max(largest, invoice.amount), 0);
  const recoveryRate =
    totalOwed + totalRecovered > 0 ? Math.round((totalRecovered / (totalOwed + totalRecovered)) * 100) : 0;
  const overdueRate = totalOwed > 0 ? Math.round((totalOverdue / totalOwed) * 100) : 0;
  const criticalAccounts = new Set(
    overdueInvoices
      .filter((invoice) => invoice.bucket === '60+' || invoice.riskScore >= 80)
      .map((invoice) => invoice.customerCompany || invoice.customerId)
      .filter(Boolean)
  ).size;
  const verifiedPayments = payments.filter((payment) => payment.status === 'verified').length;
  const pendingPayments = payments.filter((payment) => payment.status === 'pending').length;

  const balanceSlides: StatSlide[] = [
    {
      label: 'Outstanding Balance',
      value: formatINR(totalOwed),
      icon: <IndianRupee className="w-3.5 h-3.5" />,
      infoText: "Source: all non-paid, non-Done invoices in the logged-in account's Supabase-backed ledger. Recalculated whenever the ledger changes.",
      footer: (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className={neutralChip}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Overdue</span>
            <span className="font-mono font-bold text-[11px] text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatINR(totalOverdue)}
            </span>
          </div>
          <div className={neutralChip}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Recovered</span>
            <span className="font-mono font-bold text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatINR(totalRecovered)}
            </span>
          </div>
        </div>
      ),
    },
    {
      label: 'Overdue Exposure',
      value: formatINR(totalOverdue),
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      infoText: "Source: the same account-scoped ledger. An invoice is overdue when its due date is before today or daysOverdue is greater than zero.",
      footer: (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          <span>{overdueRate}% of outstanding balance</span>
          <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200/70 dark:border-rose-500/20">
            {overdueInvoices.length} overdue invoices
          </span>
        </div>
      ),
    },
    {
      label: 'Average Active Invoice',
      value: formatINR(averageActiveInvoice),
      icon: <Activity className="w-3.5 h-3.5" />,
      infoText: 'Calculated as outstanding balance divided by the number of active invoices in the current account ledger; no external estimate is used.',
      footer: (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          <span>{activeInvoices.length} active invoices in recovery</span>
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200/70 dark:border-zinc-700/70">
            Largest {formatINR(largestOverdue, { compact: true })}
          </span>
        </div>
      ),
    },
  ];

  const outreachSlides: StatSlide[] = [
    {
      label: 'Active Outreach',
      value: (
        <>
          {activeWorkflowsCount}{' '}
          <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">
            {activeWorkflowsCount === 1 ? 'Account' : 'Accounts'}
          </span>
        </>
      ),
      icon: <Users className="w-3.5 h-3.5" />,
      infoText: 'Source: active accounts with a running recovery cadence. Paid invoices and invoices marked Done are excluded.',
      footer: (
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Email • WhatsApp • Voice</span>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200/70 dark:border-zinc-700/70">
            {touchesTodayCount} touches
          </span>
        </div>
      ),
    },
    {
      label: 'Touches Today',
      value: (
        <>
          {touchesTodayCount}{' '}
          <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">
            {touchesTodayCount === 1 ? 'Touch' : 'Touches'}
          </span>
        </>
      ),
      icon: <Activity className="w-3.5 h-3.5" />,
      infoText: "Counted from today's scheduled email, WhatsApp and voice steps across active recovery workflows.",
      footer: (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          <span>Automated cadence across {activeWorkflowsCount} active accounts</span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/70 dark:border-indigo-500/20">
            Multi-channel
          </span>
        </div>
      ),
    },
    {
      label: 'Recovery Rate',
      value: (
        <>
          {recoveryRate}<span className="text-base font-normal text-zinc-500 dark:text-zinc-400">%</span>
        </>
      ),
      icon: <TrendingUp className="w-3.5 h-3.5" />,
      infoText: 'Calculated as recovered / (outstanding + recovered) from the current account ledger. Verified payment proofs are counted separately.',
      footer: (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
          <span>{paidInvoices.length} settled invoices</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200/70 dark:border-emerald-500/20">
            {verifiedPayments} verified payments
          </span>
        </div>
      ),
    },
  ];

  const ownerSlides: StatSlide[] = [
    {
      label: 'Owner Review',
      value: (
        <>
          {pendingOwnerItemsCount}{' '}
          <span className="text-base font-normal text-amber-700 dark:text-amber-400/80">Pending</span>
        </>
      ),
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      infoText: "Source: today's focus queue of disputes, approvals, broken promises and payment confirmations for the logged-in account.",
      footer: (
        <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-400 font-medium">
          <span>Disputes & Approvals</span>
          <span className={amberChip}>
            <span>Action</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </div>
      ),
    },
    {
      label: 'High-Risk Exposure',
      value: (
        <>
          {criticalAccounts}{' '}
          <span className="text-base font-normal text-amber-700 dark:text-amber-400/80">
            {criticalAccounts === 1 ? 'Account' : 'Accounts'}
          </span>
        </>
      ),
      icon: <Activity className="w-3.5 h-3.5" />,
      infoText: 'Source: invoice riskScore >= 80 or bucket 60+ in the account ledger. Each customer is counted once, even with multiple invoices.',
      footer: (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800 dark:text-amber-400 font-medium">
          <span>Risk score ≥ 80 or 60+ bucket</span>
          <span className={amberChip}>Escalation queue</span>
        </div>
      ),
    },
    {
      label: 'Payment Confirmations',
      value: (
        <>
          {pendingPayments}{' '}
          <span className="text-base font-normal text-amber-700 dark:text-amber-400/80">Pending</span>
        </>
      ),
      icon: <Clock3 className="w-3.5 h-3.5" />,
      infoText: "Source: payment records with status = 'pending'. The verified count beside it comes from status = 'verified' proofs.",
      footer: (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800 dark:text-amber-400 font-medium">
          <span>{verifiedPayments} verified payments</span>
          <span className={amberChip}>
            <CheckCircle2 className="w-3 h-3" />
            Reconciliation
          </span>
        </div>
      ),
    },
  ];

  return (
    <section className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RotatingStatCard
          slides={balanceSlides}
          tone="slate"
          onClick={onViewLedger}
          cardClassName="border-slate-200/90 dark:border-zinc-800 bg-gradient-to-b from-white via-white to-slate-50/50 dark:from-[#0D0E15] dark:to-[#0D0E15] hover:border-purple-300 dark:hover:border-zinc-700"
        />
        <RotatingStatCard
          slides={outreachSlides}
          tone="indigo"
          onClick={onViewChannels}
          cardClassName="border-slate-200/90 dark:border-zinc-800 bg-gradient-to-b from-white via-white to-slate-50/50 dark:from-[#0D0E15] dark:to-[#0D0E15] hover:border-indigo-300 dark:hover:border-zinc-700"
        />
        <RotatingStatCard
          slides={ownerSlides}
          tone="amber"
          onClick={onScrollToFocus}
          cardClassName="border-amber-300/80 dark:border-amber-500/30 bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-amber-50/20 dark:from-amber-500/[0.04] dark:to-transparent hover:border-amber-400"
        />
      </div>
    </section>
  );
};
