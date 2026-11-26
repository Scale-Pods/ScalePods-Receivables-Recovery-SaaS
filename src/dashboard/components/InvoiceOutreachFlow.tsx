import React from 'react';
import {
  CalendarDays,
  Check,
  Clock3,
  GitBranch,
  Mail,
  MessageSquare,
  PauseCircle,
  Phone,
} from 'lucide-react';

import type { ChannelType, Invoice, OutreachFlow, OutreachFlowStep } from '../types/dashboard';
import { formatRecoveryStepBadge } from '../../lib/recoverySchedule';

interface InvoiceOutreachFlowProps {
  flow: OutreachFlow;
  invoice: Invoice;
}

function getChannelIcon(channel: ChannelType) {
  if (channel === 'email') return Mail;
  if (channel === 'whatsapp') return MessageSquare;
  return Phone;
}

function getChannelLabel(channel: ChannelType) {
  if (channel === 'email') return 'EMAIL';
  if (channel === 'whatsapp') return 'WA';
  return 'CALL';
}

function formatFlowDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

type StepState = 'done' | 'today' | 'upcoming' | 'unscheduled';

function getStepState(step: OutreachFlowStep): StepState {
  if (!step.scheduledDate) return 'unscheduled';
  const today = new Date().toISOString().slice(0, 10);
  if (step.scheduledDate < today) return 'done';
  if (step.scheduledDate === today) return 'today';
  return 'upcoming';
}

const STATE_STYLES: Record<StepState, { label: string; className: string; ring: string }> = {
  done: {
    label: 'Elapsed',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300',
    ring: 'border-emerald-400 text-emerald-600 dark:text-emerald-300',
  },
  today: {
    label: 'Today',
    className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300',
    ring: 'border-violet-500 text-violet-600 dark:text-violet-300',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-300',
    ring: 'border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300',
  },
  unscheduled: {
    label: 'Unscheduled',
    className: 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400',
    ring: 'border-zinc-300 text-zinc-500 dark:border-zinc-600 dark:text-zinc-400',
  },
};

export const InvoiceOutreachFlow: React.FC<InvoiceOutreachFlowProps> = ({ flow, invoice }) => {
  if (!flow.steps.length) return null;

  const sourceLabel =
    flow.source === 'saved'
      ? 'Saved sequence'
      : flow.source === 'local'
        ? 'Local sequence'
        : 'Default sequence';

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
          <GitBranch className="h-3.5 w-3.5" />
          Outreach Sequence Flow
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {invoice.status === 'paused' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
              <PauseCircle className="h-3 w-3" />
              Paused
            </span>
          )}
          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {sourceLabel}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Due {invoice.dueDate}
          </span>
          <span>{flow.steps.length} steps</span>
          {flow.totalDays ? <span>{flow.totalDays}-day cadence</span> : null}
          <span className="inline-flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500" />
            {flow.steps.filter((step) => getStepState(step) === 'done').length} elapsed
          </span>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute bottom-3 left-[13px] top-3 w-px bg-gradient-to-b from-violet-400 via-zinc-300 to-rose-400 dark:from-violet-300 dark:via-zinc-700 dark:to-rose-500" />
          <div className="space-y-1.5">
            {flow.steps.map((step, index) => {
              const ChannelIcon = getChannelIcon(step.channels[0] || 'email');
              const state = getStepState(step);
              const stateStyle = STATE_STYLES[state];
              const showDueMarker = step.day > 0 && (flow.steps[index - 1]?.day ?? 0) < 0;

              return (
                <React.Fragment key={`${step.id || step.day}-${step.scheduledDate}`}>
                  {showDueMarker && (
                    <div className="relative flex items-center gap-2 py-1">
                      <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                        <CalendarDays className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                        Due date · cadence starts next day
                      </span>
                    </div>
                  )}

                  <div
                    className={`relative flex items-start gap-2.5 rounded-lg border px-2 py-2 ${
                      state === 'today'
                        ? 'border-violet-500/40 bg-violet-500/[0.06]'
                        : 'border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/60'
                    }`}
                  >
                    <span
                      title={step.channels.map(getChannelLabel).join(' / ')}
                      className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white dark:bg-zinc-900 ${stateStyle.ring}`}
                    >
                      <ChannelIcon className="h-3.5 w-3.5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100" title={step.headline}>
                          {step.headline}
                        </p>
                        <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {formatRecoveryStepBadge(step.day)}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          {step.stage}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                          <Clock3 className="h-3 w-3" />
                          {formatFlowDate(step.scheduledDate)}
                        </span>
                        {step.channels.length > 0 && (
                          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            {step.channels.map(getChannelLabel).join(' / ')}
                          </span>
                        )}
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${stateStyle.className}`}>
                          {stateStyle.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceOutreachFlow;
