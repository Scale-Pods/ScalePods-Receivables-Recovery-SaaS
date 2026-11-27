import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Check,
  Clock3,
  Eye,
  GitBranch,
  Mail,
  PauseCircle,
  Phone,
  X,
} from 'lucide-react';

import type { ChannelType, Invoice, OutreachDelivery, OutreachFlow, OutreachFlowStep } from '../types/dashboard';
import { formatRecoveryStepBadge } from '../../lib/recoverySchedule';
import WhatsAppLogo from '../../components/WhatsAppLogo';

interface InvoiceOutreachFlowProps {
  flow: OutreachFlow;
  invoice: Invoice;
}

function getChannelIcon(channel: ChannelType) {
  if (channel === 'email') return Mail;
  if (channel === 'whatsapp') return WhatsAppLogo;
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

function wrapSentHtml(content: string): string {
  if (/<html[\s>]/i.test(content)) return content;
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:13px;line-height:1.6;color:#18181b}img{max-width:100%}table{max-width:100%}a{color:#7c3aed}</style></head><body>${content}</body></html>`;
}

type StepState = 'sent' | 'elapsed' | 'today' | 'upcoming' | 'unscheduled';

function getStepState(step: OutreachFlowStep): StepState {
  if (step.completed) return 'sent';
  if (!step.scheduledDate) return 'unscheduled';
  const today = new Date().toISOString().slice(0, 10);
  if (step.scheduledDate < today) return 'elapsed';
  if (step.scheduledDate === today) return 'today';
  return 'upcoming';
}

const STATE_STYLES: Record<StepState, { label: string; className: string; ring: string }> = {
  sent: {
    label: 'Sent',
    className: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200',
    ring: 'border-emerald-500 text-emerald-600 dark:text-emerald-300',
  },
  elapsed: {
    label: 'Elapsed',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300',
    ring: 'border-amber-400 text-amber-600 dark:text-amber-300',
  },
  today: {
    label: 'Today',
    className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300',
    ring: 'border-violet-500 text-violet-600 dark:text-violet-300',
  },
  upcoming: {
    label: 'Upcoming',
    className: 'border-slate-200 bg-white text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
    ring: 'border-slate-300 text-slate-600 dark:border-zinc-600 dark:text-zinc-300',
  },
  unscheduled: {
    label: 'Unscheduled',
    className: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400',
    ring: 'border-slate-300 text-slate-500 dark:border-zinc-600 dark:text-zinc-400',
  },
};

export const InvoiceOutreachFlow: React.FC<InvoiceOutreachFlowProps> = ({ flow, invoice }) => {
  const [selectedStep, setSelectedStep] = useState<OutreachFlowStep | null>(null);

  useEffect(() => {
    setSelectedStep(null);
  }, [invoice.id, flow]);

  if (!flow.steps.length) return null;

  const sourceLabel =
    flow.source === 'saved'
      ? 'Saved sequence'
      : flow.source === 'local'
        ? 'Local sequence'
        : 'Default sequence';
  const sentCount = flow.steps.filter((step) => getStepState(step) === 'sent').length;
  const elapsedCount = flow.steps.filter((step) => getStepState(step) === 'elapsed').length;
  const contentDeliveries: OutreachDelivery[] = (selectedStep?.deliveries || []).filter(
    (delivery) => delivery.contentHtml.trim()
  );

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {sourceLabel}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-3 shadow-xs">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Due {invoice.dueDate}
          </span>
          <span>{flow.steps.length} steps</span>
          {flow.totalDays ? <span>{flow.totalDays}-day cadence</span> : null}
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">
            <Check className="h-3 w-3" />
            {sentCount} sent
          </span>
          {elapsedCount > 0 ? <span>{elapsedCount} elapsed</span> : null}
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute bottom-3 left-[13px] top-3 w-px bg-gradient-to-b from-violet-400 via-zinc-300 to-rose-400 dark:from-violet-300 dark:via-zinc-700 dark:to-rose-500" />
          <div className="space-y-1.5">
            {flow.steps.map((step, index) => {
              const ChannelIcon = getChannelIcon(step.channels[0] || 'email');
              const state = getStepState(step);
              const stateStyle = STATE_STYLES[state];
              const showDueMarker = step.day > 0 && (flow.steps[index - 1]?.day ?? 0) < 0;
              const hasContent = Boolean(step.deliveries?.some((delivery) => delivery.contentHtml.trim()));

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

                  <button
                    type="button"
                    onClick={() => hasContent && setSelectedStep(step)}
                    disabled={!hasContent}
                    title={hasContent ? 'View sent content' : undefined}
                    className={`relative flex w-full items-start gap-2.5 rounded-lg border px-2 py-2 text-left transition-colors ${
                      state === 'sent'
                        ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                        : state === 'today'
                          ? 'border-violet-500/40 bg-violet-500/[0.06]'
                          : 'border-slate-200 bg-white hover:bg-slate-50/80 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs'
                    } ${hasContent ? 'cursor-pointer hover:brightness-[0.98]' : 'cursor-default'}`}
                  >
                    <span
                      title={step.channels.map(getChannelLabel).join(' / ')}
                      className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white dark:bg-zinc-900 ${stateStyle.ring}`}
                    >
                      <ChannelIcon className="h-3.5 w-3.5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100" title={step.headline}>
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
                        {hasContent && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] font-semibold text-purple-700 dark:border-purple-500/25 dark:bg-purple-500/10 dark:text-purple-300">
                            <Eye className="h-3 w-3" />
                            View sent
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {selectedStep && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedStep(null)}
          role="presentation"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#121215]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Sent outreach content"
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Sent outreach content</h3>
                <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {selectedStep.headline} · {formatFlowDate(selectedStep.scheduledDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStep(null)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 py-3">
              {contentDeliveries.length ? contentDeliveries.map((delivery) => (
                <div key={`${delivery.channel}-${delivery.index}`}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <span>{getChannelLabel(delivery.channel)} #{delivery.index}</span>
                    <span>{formatFlowDate(delivery.sentDate || delivery.rawDate)}</span>
                    {delivery.sent && (
                      <span className="rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Sent
                      </span>
                    )}
                  </div>
                  <iframe
                    title={`${getChannelLabel(delivery.channel)} ${delivery.index} sent content`}
                    sandbox=""
                    srcDoc={wrapSentHtml(delivery.contentHtml)}
                    className="h-[55vh] min-h-[280px] w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-700"
                  />
                </div>
              )) : (
                <p className="py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  No saved content is available for this outreach day.
                </p>
              )}
            </div>

            <div className="flex justify-end border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedStep(null)}
                className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 dark:bg-white dark:text-zinc-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default InvoiceOutreachFlow;
