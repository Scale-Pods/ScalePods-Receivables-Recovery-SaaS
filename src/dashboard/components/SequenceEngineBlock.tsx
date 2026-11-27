import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Flame,
  Lock,
  Mail,
  Minus,
  PhoneCall,
  Plus,
  Save,
  Sliders,
  Sparkles,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { PlanTier } from '../types/dashboard';
import { UserAccount } from '../../types/auth';
import { saveSequenceToSupabase } from '../../lib/invoiceWorkflow';
import { fetchPlanLimits, getPlanRow, type PlanLimitRow } from '../../lib/planLimits';
import WhatsAppLogo from '../../components/WhatsAppLogo';

export type SequenceChannel = 'email' | 'whatsapp' | 'voice';
export type SequenceType = 'light' | 'standard' | 'intensive' | 'custom';

export interface SequenceDayStep {
  id: string;
  /** Positive days are overdue days; negative days are weeks before the due date. */
  day: number;
  phase?: 'before_due' | 'after_due';
  stage: string;
  channels: SequenceChannel[];
  tone: 'Friendly' | 'Firm' | 'Priority' | 'Urgent' | 'Human Review';
  headline: string;
  copyPreview: string;
  voiceScript?: string;
  triggerRules: string[];
}

interface SequenceTemplateStep {
  id: string;
  day: number;
  channel: SequenceChannel;
}

interface ChannelCounts {
  email: number;
  whatsapp: number;
  voice: number;
}

interface SequenceCapabilities {
  channels: Record<SequenceChannel, boolean>;
  types: Record<'light' | 'standard' | 'intensive', boolean>;
  custom: boolean;
  maxDays: number;
}

interface SequencePreset {
  id: Exclude<SequenceType, 'custom'>;
  label: string;
  description: string;
  requiredTier: PlanTier;
  icon: LucideIcon;
  accent: string;
  steps: SequenceTemplateStep[];
}

const STORAGE_KEY_CUSTOM_SEQUENCE = 'recovr_custom_sequence';
const STORAGE_KEY_TOTAL_DAYS = 'recovr_sequence_total_days';
const MAX_TOUCHES_PER_CHANNEL = 10;
/** How many weeks before the due date a customer can schedule pre-due reachouts. */
const PRE_DUE_WEEK_OPTIONS = [0, 1, 2, 3] as const;
/** Pre-due channel mix per week by plan tier; the mix repeats for each selected week. */
function preDueChannelMix(tier: PlanTier): SequenceChannel[] {
  if (tier === 'free') return ['email', 'email', 'email'];
  if (tier === 'basic') return ['email', 'email', 'whatsapp'];
  return ['email', 'whatsapp', 'voice'];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const CHANNEL_META: Array<{
  id: SequenceChannel;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredTier: PlanTier;
}> = [
  { id: 'email', label: 'Email', shortLabel: 'Email', icon: Mail, requiredTier: 'free' },
  { id: 'whatsapp', label: 'WhatsApp', shortLabel: 'WhatsApp', icon: WhatsAppLogo, requiredTier: 'basic' },
  { id: 'voice', label: 'Call', shortLabel: 'Call', icon: PhoneCall, requiredTier: 'growth' },
];

interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  compact?: boolean;
}

const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  min,
  max,
  onChange,
  label,
  compact,
}) => {
  const [draft, setDraft] = useState(String(value));
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelAccumulator = useRef(0);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    const next = clamp(Number.isFinite(parsed) && draft.trim() !== '' ? Math.round(parsed) : value, min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const step = (delta: number) => {
    const next = clamp(value + delta, min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      wheelAccumulator.current += event.deltaY;
      if (Math.abs(wheelAccumulator.current) < 16) return;

      const direction = wheelAccumulator.current > 0 ? -1 : 1;
      wheelAccumulator.current = 0;
      const next = clamp(value + direction, min, max);
      if (next === value) return;

      event.preventDefault();
      step(direction);
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [value, min, max, step]);

  return (
    <div
      ref={rootRef}
      title={`Scroll to adjust ${label.toLowerCase()}`}
      className={`inline-flex items-center overflow-hidden rounded-xl border border-purple-500/25 bg-white/85 shadow-sm transition-colors focus-within:border-purple-500 dark:border-purple-400/20 dark:bg-zinc-900/75 ${
        compact ? 'h-9' : 'h-10'
      }`}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
        className="flex h-full w-8 items-center justify-center border-r border-purple-500/15 text-zinc-500 transition-colors hover:bg-purple-500/10 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-purple-400/10 dark:text-zinc-400 dark:hover:text-purple-300"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        min={min}
        max={max}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit();
            event.currentTarget.blur();
          }
        }}
        aria-label={label}
        className="h-full w-12 bg-transparent text-center font-mono text-xs font-bold text-zinc-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:text-white"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
        className="flex h-full w-8 items-center justify-center border-l border-purple-500/15 text-zinc-500 transition-colors hover:bg-purple-500/10 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-30 dark:border-purple-400/10 dark:text-zinc-400 dark:hover:text-purple-300"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

interface ChannelSelectProps {
  value: SequenceChannel;
  options: SequenceChannel[];
  counts: ChannelCounts;
  onChange: (value: SequenceChannel) => void;
  label: string;
}

const ChannelSelect: React.FC<ChannelSelectProps> = ({ value, options, counts, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const wheelAccumulator = useRef(0);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || open || options.length < 2) return;

    const handleWheel = (event: WheelEvent) => {
      wheelAccumulator.current += event.deltaY;
      if (Math.abs(wheelAccumulator.current) < 16) return;

      const direction = wheelAccumulator.current > 0 ? 1 : -1;
      wheelAccumulator.current = 0;

      const currentIndex = Math.max(0, options.indexOf(value));
      let next: SequenceChannel | null = null;
      for (let offset = 1; offset <= options.length; offset += 1) {
        const index = (currentIndex + direction * offset + options.length) % options.length;
        const candidate = options[index];
        if (candidate === value) break;
        if (counts[candidate] < MAX_TOUCHES_PER_CHANNEL) {
          next = candidate;
          break;
        }
      }
      if (!next) return;

      event.preventDefault();
      onChange(next);
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [open, options, value, counts, onChange]);

  const selectedMeta = CHANNEL_META.find((meta) => meta.id === value)!;
  const SelectedIcon = selectedMeta.icon;

  return (
    <div ref={rootRef} title="Scroll to change channel" className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-purple-500/25 bg-white/85 px-2.5 text-xs font-bold text-zinc-800 shadow-sm transition-colors hover:border-purple-500 focus:border-purple-500 focus:outline-none dark:border-purple-400/20 dark:bg-zinc-900/75 dark:text-zinc-100"
      >
        <span className="flex min-w-0 items-center gap-2">
          <SelectedIcon className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-300" />
          <span className="truncate">{selectedMeta.shortLabel}</span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-purple-500/25 bg-white/95 p-1 shadow-xl backdrop-blur-md dark:border-purple-400/20 dark:bg-zinc-900/95"
        >
          {options.map((id) => {
            const meta = CHANNEL_META.find((item) => item.id === id)!;
            const Icon = meta.icon;
            const selected = id === value;
            const maxed = counts[id] >= MAX_TOUCHES_PER_CHANNEL && !selected;

            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={maxed}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${
                  selected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-700 hover:bg-purple-500/10 hover:text-purple-700 dark:text-zinc-200 dark:hover:text-purple-300'
                } ${maxed ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-white' : 'text-purple-600 dark:text-purple-300'}`} />
                <span className="truncate">{meta.label}</span>
                {maxed && <span className="ml-auto text-[9px] font-mono">max</span>}
                {selected && <Check className="ml-auto h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PRESETS: SequencePreset[] = [
  {
    id: 'light',
    label: 'Light Sequence',
    description: 'Low-frequency follow-ups with sufficient gaps between communications.',
    requiredTier: 'free',
    icon: Sparkles,
    accent: 'violet',
    steps: [
      { id: 'light-1', day: 1, channel: 'email' },
      { id: 'light-4', day: 4, channel: 'whatsapp' },
      { id: 'light-8', day: 8, channel: 'email' },
      { id: 'light-12', day: 12, channel: 'voice' },
      { id: 'light-16', day: 16, channel: 'whatsapp' },
      { id: 'light-21', day: 21, channel: 'email' },
      { id: 'light-26', day: 26, channel: 'voice' },
      { id: 'light-30', day: 30, channel: 'whatsapp' },
    ],
  },
  {
    id: 'standard',
    label: 'Standard Sequence',
    description: 'Balanced communication across all three channels.',
    requiredTier: 'basic',
    icon: Mail,
    accent: 'indigo',
    steps: [
      { id: 'standard-1', day: 1, channel: 'email' },
      { id: 'standard-3', day: 3, channel: 'whatsapp' },
      { id: 'standard-5', day: 5, channel: 'voice' },
      { id: 'standard-7', day: 7, channel: 'email' },
      { id: 'standard-10', day: 10, channel: 'whatsapp' },
      { id: 'standard-13', day: 13, channel: 'voice' },
      { id: 'standard-16', day: 16, channel: 'email' },
      { id: 'standard-19', day: 19, channel: 'whatsapp' },
      { id: 'standard-22', day: 22, channel: 'voice' },
      { id: 'standard-25', day: 25, channel: 'email' },
      { id: 'standard-28', day: 28, channel: 'whatsapp' },
      { id: 'standard-30', day: 30, channel: 'voice' },
    ],
  },
  {
    id: 'intensive',
    label: 'Intense Sequence',
    description: 'Frequent communication for overdue and high-priority receivables.',
    requiredTier: 'growth',
    icon: Flame,
    accent: 'orange',
    steps: [
      { id: 'intense-1', day: 1, channel: 'email' },
      { id: 'intense-2', day: 2, channel: 'whatsapp' },
      { id: 'intense-3', day: 3, channel: 'voice' },
      { id: 'intense-5', day: 5, channel: 'email' },
      { id: 'intense-6', day: 6, channel: 'whatsapp' },
      { id: 'intense-7', day: 7, channel: 'voice' },
      { id: 'intense-9', day: 9, channel: 'email' },
      { id: 'intense-10', day: 10, channel: 'whatsapp' },
      { id: 'intense-11', day: 11, channel: 'voice' },
      { id: 'intense-13', day: 13, channel: 'email' },
      { id: 'intense-14', day: 14, channel: 'whatsapp' },
      { id: 'intense-15', day: 15, channel: 'voice' },
      { id: 'intense-17', day: 17, channel: 'email' },
      { id: 'intense-18', day: 18, channel: 'whatsapp' },
      { id: 'intense-19', day: 19, channel: 'voice' },
      { id: 'intense-21', day: 21, channel: 'email' },
      { id: 'intense-23', day: 23, channel: 'whatsapp' },
      { id: 'intense-25', day: 25, channel: 'voice' },
      { id: 'intense-27', day: 27, channel: 'email' },
      { id: 'intense-29', day: 29, channel: 'whatsapp' },
      { id: 'intense-30', day: 30, channel: 'voice' },
    ],
  },
];

export const default21DaySequence: SequenceDayStep[] = [
  {
    id: 'step-1',
    day: 1,
    stage: 'Friendly',
    channels: ['email'],
    tone: 'Friendly',
    headline: 'Due Notice & Razorpay Checkout Link',
    copyPreview: 'Hi {{customer_name}}, this is a reminder that invoice {{invoice_number}} for ₹{{amount}} was due yesterday. Settle securely via UPI/NEFT: {{razorpay_link}}',
    triggerRules: ['Sent post-grace period', 'Stops instantly on Razorpay/bank webhook'],
  },
  {
    id: 'step-21',
    day: 21,
    stage: 'Final Blitz',
    channels: ['voice', 'whatsapp', 'email'],
    tone: 'Urgent',
    headline: 'Day 21: Sequence Concludes',
    copyPreview: 'FINAL NOTICE: 21-day autonomous cycle completes today. Outstanding: ₹{{amount}}. Unsettled accounts move to Human Approval review.',
    voiceScript: 'Final automated notification. 21-day recovery sequence is concluding. Please remit via {{razorpay_link}}.',
    triggerRules: ['Autonomous sequence concludes', 'Moves to Approvals tab for Human Approval'],
  },
];

function planNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return null;
}

function fallbackCapabilities(tier: PlanTier): SequenceCapabilities {
  const maxDays = tier === 'enterprise' ? 90 : 30;
  if (tier === 'free') {
    return {
      channels: { email: true, whatsapp: false, voice: false },
      types: { light: true, standard: false, intensive: false },
      custom: false,
      maxDays,
    };
  }
  if (tier === 'basic') {
    return {
      channels: { email: true, whatsapp: true, voice: false },
      types: { light: true, standard: true, intensive: false },
      custom: false,
      maxDays,
    };
  }
  return {
    channels: { email: true, whatsapp: true, voice: true },
    types: { light: true, standard: true, intensive: true },
    custom: true,
    maxDays,
  };
}

function capabilitiesFromPlanRow(row: PlanLimitRow | undefined, tier: PlanTier): SequenceCapabilities {
  const base = fallbackCapabilities(tier);
  if (!row) return base;

  return {
    channels: {
      email: row.email_enabled ?? base.channels.email,
      whatsapp: row.whatsapp_enabled ?? base.channels.whatsapp,
      voice: row.ai_calls_enabled ?? base.channels.voice,
    },
    types: {
      light: row.light_sequence_enabled ?? base.types.light,
      standard: row.standard_sequence_enabled ?? base.types.standard,
      intensive: row.intensive_sequence_enabled ?? base.types.intensive,
    },
    custom: row.editable_sequence_enabled ?? base.custom,
    // Presets are fixed 30-day templates, so the effective floor is 30 days.
    maxDays: Math.max(30, clamp(planNumber(row.max_sequence_days) ?? base.maxDays, 1, 180)),
  };
}

function filterStepsForCaps(steps: SequenceTemplateStep[], caps: SequenceCapabilities): SequenceTemplateStep[] {
  return steps.filter((step) => caps.channels[step.channel]);
}

function limitChannelCounts(steps: SequenceTemplateStep[]): SequenceTemplateStep[] {
  const seen: ChannelCounts = { email: 0, whatsapp: 0, voice: 0 };
  return steps.filter((step) => {
    if (seen[step.channel] >= MAX_TOUCHES_PER_CHANNEL) return false;
    seen[step.channel] += 1;
    return true;
  });
}

function countSteps(steps: SequenceTemplateStep[]): ChannelCounts {
  const counts: ChannelCounts = { email: 0, whatsapp: 0, voice: 0 };
  for (const step of steps) counts[step.channel] += 1;
  return counts;
}

function totalCount(counts: ChannelCounts): number {
  return counts.email + counts.whatsapp + counts.voice;
}

function maxStepDay(steps: SequenceTemplateStep[]): number {
  return steps.reduce((max, step) => Math.max(max, step.day), 1);
}

function sameSteps(a: SequenceTemplateStep[], b: SequenceTemplateStep[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.day - y.day);
  const sortedB = [...b].sort((x, y) => x.day - y.day);
  return sortedA.every((step, index) => step.day === sortedB[index].day && step.channel === sortedB[index].channel);
}

function stepsFromSequence(sequence: SequenceDayStep[]): SequenceTemplateStep[] {
  return sequence
    .filter((step) => step.day > 0)
    .map((step, index) => ({
      id: step.id || `custom-${index}`,
      day: step.day,
      channel: step.channels[0] || 'email',
    }));
}

function formatStepTiming(day: number): string {
  if (day > 0) return `Day ${day}`;
  const weeks = Math.abs(day) / 7;
  if (Number.isInteger(weeks) && weeks >= 1) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} before`;
  }
  return `${Math.abs(day)} days before`;
}

/**
 * Repeats the tier's pre-due channel mix once per selected week. For example,
 * 3 weeks prior on basic drafts 6 touches: 2 emails + 1 WhatsApp each week.
 */
function buildPreDueTemplateSteps(
  weeks: number,
  caps: SequenceCapabilities,
  tier: PlanTier
): SequenceTemplateStep[] {
  if (weeks === 0) return [];
  const mix = preDueChannelMix(tier).map((channel) => (caps.channels[channel] ? channel : 'email'));

  return Array.from({ length: weeks }).flatMap((_, weekIndex) => {
    const weeksPrior = weeks - weekIndex;
    return mix.map((channel, position) => {
      const day = -7 * weeksPrior + Math.floor((position * 7) / mix.length);
      return { id: `pre-due-${Math.abs(day)}d-w${weeksPrior}-${position}`, day, channel };
    });
  });
}

function preDueWeeksFromSequence(sequence: SequenceDayStep[]): number {
  const earliestDay = sequence.reduce((min, step) => Math.min(min, step.day), 0);
  return clamp(Math.round(Math.abs(Math.min(0, earliestDay)) / 7), 0, 3);
}

function getPreDueHeadline(channel: SequenceChannel, weeks: number): string {
  const subject =
    weeks >= 3
      ? 'Early payment reminder'
      : weeks === 2
        ? 'Advance payment reminder'
        : 'Gentle payment heads-up';
  if (channel === 'whatsapp') return `WhatsApp: ${subject}`;
  if (channel === 'voice') return `Call: ${subject}`;
  return `Email: ${subject}`;
}

function getPreDueCopy(channel: SequenceChannel, weeks: number): string {
  if (channel === 'whatsapp') {
    return 'Hi {{customer_name}}, a quick heads-up that invoice {{invoice_number}} for ₹{{amount}} is due on {{due_date}}. You can settle early via {{razorpay_link}}. Thank you!';
  }
  if (channel === 'voice') {
    return 'Namaste, this is an advance reminder for invoice {{invoice_number}} for ₹{{amount}}, due on {{due_date}}. May I confirm the payment plan?';
  }
  if (weeks === 1) {
    return 'Hi {{customer_name}}, invoice {{invoice_number}} for ₹{{amount}} is due on {{due_date}}. Just a friendly heads-up so you can plan the payment. Settle securely via {{razorpay_link}}. Thank you!';
  }
  if (weeks === 2) {
    return 'Hi {{customer_name}}, a quick advance reminder that invoice {{invoice_number}} for ₹{{amount}} falls due on {{due_date}}. You can settle early via {{razorpay_link}}. Thank you!';
  }
  return 'Hi {{customer_name}}, looking ahead to invoice {{invoice_number}} for ₹{{amount}} due on {{due_date}}. Sharing the payment link {{razorpay_link}} in advance for your convenience.';
}

function recommendedPreset(tier: PlanTier, caps: SequenceCapabilities): SequencePreset {
  const preferred: Exclude<SequenceType, 'custom'> =
    tier === 'free' ? 'light' : tier === 'basic' ? 'standard' : 'intensive';
  const ordered = [
    PRESETS.find((preset) => preset.id === preferred)!,
    ...PRESETS.filter((preset) => preset.id !== preferred),
  ];
  return ordered.find((preset) => caps.types[preset.id]) || PRESETS[0];
}

function getDefaultCopyForTone(tone: SequenceDayStep['tone']): string {
  switch (tone) {
    case 'Friendly':
      return 'Hi {{customer_name}}, this is a gentle reminder that invoice {{invoice_number}} for ₹{{amount}} is due on {{due_date}}. Please remit via {{razorpay_link}}. Thank you!';
    case 'Firm':
      return 'Notice: Invoice {{invoice_number}} for ₹{{amount}} was due on {{due_date}} and remains unsettled. Remit today via {{razorpay_link}}.';
    case 'Priority':
      return 'Priority Notice: Invoice {{invoice_number}} (₹{{amount}}) is significantly overdue. Unsettled balance may impact commercial credit terms. Pay now: {{razorpay_link}}';
    case 'Urgent':
      return 'URGENT: Invoice {{invoice_number}} (₹{{amount}}) is past due. Daily outreach active. Remit via UPI / NetBanking: {{razorpay_link}}.';
    default:
      return 'Autonomous recovery cycle concludes. Invoice moved to internal executive review pending human approval.';
  }
}

function getDefaultVoiceScriptForTone(tone: SequenceDayStep['tone']): string {
  switch (tone) {
    case 'Friendly':
      return 'Namaste, this is an automated follow-up regarding invoice {{invoice_number}} for ₹{{amount}}. May I confirm if payment is scheduled?';
    case 'Firm':
      return 'Hello, calling regarding overdue invoice {{invoice_number}} for ₹{{amount}}. Please complete settlement via the link sent to your registered contact.';
    case 'Priority':
      return 'Namaste, this is the accounts assistant regarding overdue invoice {{invoice_number}} for ₹{{amount}}. May I confirm if payment is being processed today?';
    case 'Urgent':
      return 'Urgent escalation notice for invoice {{invoice_number}} with an outstanding balance of ₹{{amount}}. Please remit immediately today.';
    default:
      return '';
  }
}

function getStageForTone(tone: SequenceDayStep['tone']): string {
  if (tone === 'Friendly' || tone === 'Firm') return tone;
  if (tone === 'Priority') return 'Escalation';
  if (tone === 'Urgent') return 'Final Blitz';
  return 'Human Review';
}

function getChannelHeadline(channel: SequenceChannel, index: number): string {
  if (channel === 'email') return `Email ${index}: Payment Reminder`;
  if (channel === 'whatsapp') return `WhatsApp ${index}: Quick Touch`;
  return `Call ${index}: Payment Confirmation`;
}

function getChannelRules(channel: SequenceChannel): string[] {
  if (channel === 'email') return ['Stops instantly on payment verification', 'Audit entry written to ledger'];
  if (channel === 'whatsapp') return ['WhatsApp opt-in verified', '"PAID" reply pauses the cadence'];
  return ['9:00 AM – 7:00 PM IST calling window', 'Call outcome logged to audit trail'];
}

function buildSequenceFromTemplateSteps(steps: SequenceTemplateStep[]): SequenceDayStep[] {
  const sorted = [...steps].sort((a, b) => a.day - b.day);
  if (sorted.length === 0) return [];

  const countsByChannel: ChannelCounts = { email: 0, whatsapp: 0, voice: 0 };

  return sorted.map((step, index) => {
    countsByChannel[step.channel] += 1;

    if (step.day < 0) {
      const weeks = Math.max(1, Math.round(Math.abs(step.day) / 7));
      const copyPreview = getPreDueCopy(step.channel, weeks);
      return {
        id: step.id,
        day: step.day,
        phase: 'before_due' as const,
        stage: 'Pre-due',
        channels: [step.channel],
        tone: 'Friendly' as const,
        headline: `${formatStepTiming(step.day)} due date: ${getPreDueHeadline(step.channel, weeks)}`,
        copyPreview,
        voiceScript: step.channel === 'voice' ? copyPreview : undefined,
        triggerRules: [
          'Runs before the due date',
          'Stops instantly on payment verification',
          'Audit entry written to ledger',
        ],
      };
    }

    const progress = sorted.length === 1 ? 0 : index / (sorted.length - 1);
    const tone: SequenceDayStep['tone'] =
      progress < 0.35 ? 'Friendly' : progress < 0.7 ? 'Firm' : progress < 0.9 ? 'Priority' : 'Urgent';

    return {
      id: step.id,
      day: step.day,
      stage: getStageForTone(tone),
      channels: [step.channel],
      tone,
      headline: getChannelHeadline(step.channel, countsByChannel[step.channel]),
      copyPreview: getDefaultCopyForTone(tone),
      voiceScript: step.channel === 'voice' ? getDefaultVoiceScriptForTone(tone) : undefined,
      triggerRules: getChannelRules(step.channel),
    };
  });
}

interface SequenceEngineBlockProps {
  planTier: PlanTier;
  onUpgradePrompt: (tier: PlanTier) => void;
  currentUser?: UserAccount | null;
}

export const SequenceEngineBlock: React.FC<SequenceEngineBlockProps> = ({
  planTier,
  onUpgradePrompt,
  currentUser,
}) => {
  const loggedInCustomerUid =
    currentUser?.customer_uid ||
    currentUser?.uid ||
    (() => {
      try {
        const stored = localStorage.getItem('recovr_user_account');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.customer_uid || parsed.uid;
        }
      } catch {}
      return undefined;
    })();

  const loggedInUserId =
    loggedInCustomerUid ||
    currentUser?.id ||
    currentUser?.email ||
    (() => {
      try {
        const stored = localStorage.getItem('recovr_user_account');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.id || parsed.email || 'user-client';
        }
      } catch {}
      return 'user-client';
    })();

  const userSequenceKey = `recovr_custom_sequence_${loggedInUserId}`;
  const userDaysKey = `recovr_sequence_total_days_${loggedInUserId}`;

  const [planRows, setPlanRows] = useState<PlanLimitRow[]>([]);
  const caps = useMemo(
    () => capabilitiesFromPlanRow(getPlanRow(planRows, planTier), planTier),
    [planRows, planTier]
  );
  const capsSignature = JSON.stringify(caps);

  const initialRef = useRef<{
    type: SequenceType;
    customSteps: SequenceTemplateStep[];
    preDueWeeks: number;
  } | null>(null);

  if (!initialRef.current) {
    let storedSequence: SequenceDayStep[] | null = null;
    try {
      const userStored = localStorage.getItem(userSequenceKey);
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_SEQUENCE);
      const parsed = userStored || stored ? JSON.parse(userStored || stored || '[]') : null;
      if (Array.isArray(parsed) && parsed.length > 0) storedSequence = parsed as SequenceDayStep[];
    } catch {}

    const initialCaps = fallbackCapabilities(planTier);
    const initialPreset = recommendedPreset(planTier, initialCaps);
    let initialType: SequenceType = initialPreset.id;
    let initialCustomSteps: SequenceTemplateStep[] = [];

    if (storedSequence) {
      const storedTemplate = stepsFromSequence(storedSequence);
      const matched = PRESETS.find((preset) =>
        sameSteps(filterStepsForCaps(preset.steps, initialCaps), storedTemplate)
      );
      if (matched && initialCaps.types[matched.id]) {
        initialType = matched.id;
      } else if (initialCaps.custom) {
        initialType = 'custom';
        initialCustomSteps = limitChannelCounts(
          storedTemplate.filter((step) => initialCaps.channels[step.channel])
        );
      } else {
        initialType = initialPreset.id;
      }
    }

    initialRef.current = {
      type: initialType,
      customSteps: initialCustomSteps,
      preDueWeeks: storedSequence ? preDueWeeksFromSequence(storedSequence) : 0,
    };
  }

  const [selectedType, setSelectedType] = useState<SequenceType>(initialRef.current.type);
  const [customSteps, setCustomSteps] = useState<SequenceTemplateStep[]>(initialRef.current.customSteps);
  const [preDueWeeks, setPreDueWeeks] = useState<number>(initialRef.current.preDueWeeks);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlanLimits()
      .then((rows) => {
        if (!cancelled) setPlanRows(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const isTypeAllowed = (type: SequenceType): boolean => {
    if (type === 'custom') return caps.custom;
    return caps.types[type];
  };

  useEffect(() => {
    let nextType = selectedType;
    if (!isTypeAllowed(nextType)) nextType = recommendedPreset(planTier, caps).id;

    const nextCustomSteps = limitChannelCounts(
      customSteps.filter((step) => caps.channels[step.channel])
    );

    if (nextType !== selectedType || nextCustomSteps.length !== customSteps.length) {
      setSelectedType(nextType);
      setCustomSteps(nextCustomSteps);
    }
    // capsSignature captures every capability change without retriggering on object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capsSignature, planTier]);

  const preDueTemplateSteps = useMemo(
    () => buildPreDueTemplateSteps(preDueWeeks, caps, planTier),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preDueWeeks, planTier, capsSignature]
  );
  const preDueTouchCount = preDueTemplateSteps.length;

  const templateSteps = useMemo(() => {
    const postDueSteps =
      selectedType === 'custom'
        ? customSteps
        : PRESETS.find((item) => item.id === selectedType)?.steps || [];
    return limitChannelCounts([...preDueTemplateSteps, ...filterStepsForCaps(postDueSteps, caps)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, customSteps, preDueTemplateSteps, capsSignature]);

  const counts = useMemo(() => countSteps(templateSteps), [templateSteps]);
  const sequence = useMemo(() => buildSequenceFromTemplateSteps(templateSteps), [templateSteps]);
  const totalDays = useMemo(
    () => clamp(maxStepDay(templateSteps), 1, caps.maxDays),
    [templateSteps, caps.maxDays]
  );

  const applyPreset = (preset: SequencePreset) => {
    if (!caps.types[preset.id]) {
      onUpgradePrompt(preset.requiredTier);
      return;
    }

    setSelectedType(preset.id);
    setStatusMessage(null);
  };

  const applyCustom = () => {
    if (!caps.custom) {
      onUpgradePrompt('growth');
      return;
    }
    setSelectedType('custom');
    setStatusMessage(null);
  };

  const applyPreDueWeeks = (weeks: number) => {
    setPreDueWeeks(clamp(weeks, 0, Math.max(...PRE_DUE_WEEK_OPTIONS)));
    setStatusMessage(null);
  };

  const addCustomStep = () => {
    if (!caps.custom) {
      onUpgradePrompt('growth');
      return;
    }

    const channel = CHANNEL_META.find(
      (meta) => caps.channels[meta.id] && counts[meta.id] < MAX_TOUCHES_PER_CHANNEL
    )?.id;
    if (!channel) {
      setStatusMessage('All available channels have reached the maximum 10 touches.');
      return;
    }

    const day = clamp(customSteps.reduce((max, step) => Math.max(max, step.day), 0) + 1, 1, caps.maxDays);
    setCustomSteps((prev) => [...prev, { id: `custom-${Date.now()}-${prev.length}`, day, channel }]);
    setSelectedType('custom');
    setStatusMessage(null);
  };

  const updateCustomStep = (id: string, patch: Partial<Pick<SequenceTemplateStep, 'day' | 'channel'>>) => {
    if (patch.channel) {
      const existing = customSteps.find((step) => step.id === id);
      if (existing && existing.channel !== patch.channel && counts[patch.channel] >= MAX_TOUCHES_PER_CHANNEL) {
        setStatusMessage(
          `${CHANNEL_META.find((item) => item.id === patch.channel)?.label} already has the maximum 10 touches.`
        );
        return;
      }
    }

    const nextDay =
      patch.day === undefined ? undefined : clamp(Math.round(patch.day || 1), 1, caps.maxDays);

    setCustomSteps((prev) =>
      prev.map((step) =>
        step.id === id
          ? { ...step, ...patch, ...(nextDay === undefined ? {} : { day: nextDay }) }
          : step
      )
    );
    setStatusMessage(null);
  };

  const removeCustomStep = (id: string) => {
    setCustomSteps((prev) => prev.filter((step) => step.id !== id));
    setStatusMessage(null);
  };

  const persistSequence = (steps: SequenceDayStep[], days: number) => {
    const sorted = [...steps].sort((a, b) => a.day - b.day);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SEQUENCE, JSON.stringify(sorted));
      localStorage.setItem(STORAGE_KEY_TOTAL_DAYS, String(days));
      localStorage.setItem(userSequenceKey, JSON.stringify(sorted));
      localStorage.setItem(userDaysKey, String(days));
    } catch (error) {
      console.warn('Sequence storage notice', error);
    }
  };

  const handleSave = async () => {
    if (sequence.length === 0) {
      setStatusMessage('Add at least one sequence step before saving.');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setSaveSuccess(false);
    persistSequence(sequence, totalDays);

    try {
      await saveSequenceToSupabase({
        userEmail: currentUser?.email || '',
        customer_uid: loggedInCustomerUid || loggedInUserId,
        tier: planTier,
        totalDays,
        sequence: sequence.map((step) => ({
          id: step.id,
          day: step.day,
          phase: step.phase,
          stage: step.stage,
          tone: step.tone,
          channels: step.channels,
          headline: step.headline,
          triggerRules: step.triggerRules,
        })),
      });
      setSaveSuccess(true);
      setStatusMessage('Sequence saved. New invoices will use this saved cadence.');
    } catch (error) {
      console.warn('Sequence save fallback:', error);
      setSaveSuccess(true);
      setStatusMessage('Sequence saved locally. Supabase sync is unavailable right now.');
    } finally {
      setIsSaving(false);
      window.setTimeout(() => setSaveSuccess(false), 3500);
      window.setTimeout(() => setStatusMessage(null), 6000);
    }
  };

  const selectedPreset = PRESETS.find((preset) => preset.id === selectedType);

  return (
    <div className="space-y-5">
      <div className="dashboard-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300">
              <Sliders className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              Sequence Studio
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Choose a cadence, add reminders before the due date, build your own plan, and preview the exact
            schedule before saving.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            {planTier} plan
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:cursor-wait disabled:opacity-80 ${
              saveSuccess
                ? 'bg-emerald-600 shadow-emerald-600/30'
                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-purple-600/30'
            }`}
          >
            {isSaving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Sequence
              </>
            )}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="dashboard-card flex items-center gap-2 px-4 py-3 text-xs text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  1. Choose sequence type
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Channels unavailable in your plan are removed automatically.
                </p>
              </div>
              <span className="hidden text-[10px] font-mono text-zinc-400 sm:block">
                Max 10 touches / channel / invoice
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {PRESETS.map((preset) => {
                const allowed = caps.types[preset.id];
                const active = selectedType === preset.id;
                const presetCounts = countSteps(filterStepsForCaps(preset.steps, caps));
                const availableChannels = CHANNEL_META.filter(
                  (meta) => caps.channels[meta.id] && preset.steps.some((step) => step.channel === meta.id)
                ).map((meta) => meta.shortLabel);
                const Icon = preset.icon;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    data-accent={preset.accent}
                    className={`dashboard-card relative flex flex-col gap-2 p-4 text-left transition-all ${
                      active ? 'is-selected' : ''
                    } ${allowed ? 'cursor-pointer' : 'cursor-pointer opacity-65'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      {active ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white shadow-xs">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : !allowed ? (
                        <Lock className="h-4 w-4 text-zinc-400" />
                      ) : null}
                    </div>

                    <div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-white">{preset.label}</div>
                      <p className="mt-1 min-h-[46px] text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {preset.description}
                      </p>
                      {allowed && availableChannels.length > 0 && (
                        <div className="mt-1 text-[10px] font-semibold text-zinc-400">
                          Channels: {availableChannels.join(' · ')}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                      <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-800/60">
                        30d
                      </span>
                      <span>
                        Total: {presetCounts.email} Emails · {presetCounts.whatsapp} WhatsApp ·{' '}
                        {presetCounts.voice} Calls = {totalCount(presetCounts)} touchpoints
                      </span>
                    </div>

                    {!allowed && (
                      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {preset.requiredTier} plan and above
                      </div>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={applyCustom}
                data-accent="emerald"
                className={`dashboard-card relative flex flex-col gap-2 p-4 text-left transition-all ${
                  selectedType === 'custom' ? 'is-selected' : ''
                } ${caps.custom ? 'cursor-pointer' : 'cursor-pointer opacity-65'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Sliders className="h-4 w-4" />
                  </span>
                  {selectedType === 'custom' ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : !caps.custom ? (
                    <Lock className="h-4 w-4 text-zinc-400" />
                  ) : null}
                </div>

                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-white">Custom Sequence</div>
                  <p className="mt-1 min-h-[46px] text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Build your own day-by-day cadence with the channels your plan allows.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  <span className="rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-800/60">
                    Your days
                  </span>
                  <span>{totalCount(counts)} touches</span>
                </div>

                {!caps.custom && (
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    growth plan and above
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="dashboard-card p-5">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  2. Pre-due date reachouts
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Choose how early reminders start before the due date. Free drafts 3 emails per week,
                  Basic 2 emails + 1 WhatsApp, Growth and Enterprise email + WhatsApp + call. The mix
                  repeats for 2 or 3 weeks prior.
                </p>
              </div>
              <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                {preDueWeeks === 0 ? 'None' : `${preDueTouchCount} pre-due touch${preDueTouchCount === 1 ? '' : 'es'}`}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {PRE_DUE_WEEK_OPTIONS.map((weeks) => {
                const active = preDueWeeks === weeks;
                return (
                  <button
                    key={weeks}
                    type="button"
                    onClick={() => applyPreDueWeeks(weeks)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-purple-600 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold'
                        : 'border-zinc-200 bg-white/70 text-zinc-700 hover:border-purple-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:border-purple-400/40'
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-bold">
                        {weeks === 0 ? 'None' : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} prior`}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-zinc-500 dark:text-zinc-400">
                        {weeks === 0
                          ? 'Starts after the due date'
                          : `${weeks * 7}-day pre-due window`}
                      </span>
                    </span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {preDueWeeks > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                <span>Drafted:</span>
                {preDueTemplateSteps.map((step) => {
                  const channelLabel = CHANNEL_META.find((meta) => meta.id === step.channel)?.shortLabel;
                  return (
                    <span
                      key={step.id}
                      className="rounded-md border border-purple-500/20 bg-purple-500/10 px-1.5 py-0.5 text-purple-700 dark:text-purple-300"
                    >
                      {formatStepTiming(step.day)} · {channelLabel}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dashboard-card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                  3. Generated cadence
                </h3>
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {selectedPreset
                    ? `${selectedPreset.label} · ${totalDays}-day span`
                    : `Custom sequence · ${totalDays}-day span`}
                  {preDueWeeks > 0 ? ` · ${preDueTouchCount} pre-due touch${preDueTouchCount === 1 ? '' : 'es'}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                <span>Email {counts.email}/10</span>
                <span>·</span>
                <span>WhatsApp {counts.whatsapp}/10</span>
                <span>·</span>
                <span>Call {counts.voice}/10</span>
              </div>
            </div>

            {selectedType === 'custom' && (
              <div className="mb-4 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-4 dark:border-purple-400/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Build your own sequence</h4>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Start with one card, choose its day and channel, then add the next one. No fixed
                      minimum — you decide how many touches to add, up to 10 per channel. Scroll over a
                      day or channel to change it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomStep}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-purple-600/25 px-3 py-2 text-[11px] font-bold text-white transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {customSteps.length === 0 ? 'Start with your sequence' : 'Add next step'}
                  </button>
                </div>

                {customSteps.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {customSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className="grid grid-cols-[auto_120px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-purple-500/20 bg-white/80 p-2 dark:border-purple-400/15 dark:bg-zinc-900/60"
                      >
                        <span className="px-1 font-mono text-[10px] font-bold text-zinc-400">#{index + 1}</span>
                        <NumberStepper
                          value={step.day}
                          min={1}
                          max={caps.maxDays}
                          onChange={(day) => updateCustomStep(step.id, { day })}
                          label={`Day for step ${index + 1}`}
                          compact
                        />
                        <ChannelSelect
                          value={step.channel}
                          options={CHANNEL_META.filter((meta) => caps.channels[meta.id]).map((meta) => meta.id)}
                          counts={counts}
                          onChange={(channel) => updateCustomStep(step.id, { channel })}
                          label={`Channel for step ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => removeCustomStep(step.id)}
                          aria-label={`Remove step ${index + 1}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-purple-300 py-6 text-center dark:border-purple-500/30">
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                      No custom steps yet
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Click “Start with your sequence” to create the first card.
                    </p>
                  </div>
                )}
              </div>
            )}

            {sequence.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 py-10 text-center dark:border-zinc-700">
                <Sliders className="h-7 w-7 text-zinc-400" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Add at least one sequence step
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Choose a preset above or build your own custom cadence.
                </p>
              </div>
            ) : (
              <div className="grid max-h-[460px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {sequence.map((step, index) => {
                  const channel = step.channels[0];
                  const meta = CHANNEL_META.find((item) => item.id === channel)!;
                  const Icon = meta.icon;

                  return (
                    <div
                      key={`${step.id}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <span className="shrink-0 rounded-lg bg-zinc-100 px-2 py-1 font-mono text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        <span title={step.copyPreview}>{formatStepTiming(step.day)}</span>
                      </span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-300">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">
                          {meta.shortLabel}
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                          {step.phase === 'before_due' ? step.headline : `${step.stage} · ${step.tone}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 border-t border-zinc-200 pt-3 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800 dark:text-zinc-200">
              Total: {counts.email} Emails · {counts.whatsapp} WhatsApp · {counts.voice} Calls ={' '}
              {totalCount(counts)} touchpoints
            </div>
          </div>
        </div>

        <div className="dashboard-card p-4 xl:sticky xl:top-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              4. Finalized sequence
            </h3>
            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700 dark:text-purple-300">
              {sequence.length} steps
            </span>
          </div>

          {sequence.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 py-8 text-center dark:border-zinc-700">
              <Sliders className="h-6 w-6 text-zinc-400" />
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Nothing to flow yet
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Choose a cadence or add a custom step.
              </p>
            </div>
          ) : (
            <div className="relative max-h-[620px] overflow-y-auto pr-1">
              <div className="pointer-events-none absolute bottom-4 left-[13px] top-4 w-px bg-gradient-to-b from-purple-400 via-zinc-300 to-rose-400 dark:from-purple-300 dark:via-zinc-700 dark:to-rose-500" />
              <div className="space-y-2">
                {sequence.map((step, index) => {
                  const channel = step.channels[0];
                  const meta = CHANNEL_META.find((item) => item.id === channel)!;
                  const Icon = meta.icon;
                  const beforeDue = step.day < 0;
                  const showDueMarker = !beforeDue && sequence[index - 1]?.day < 0;

                  return (
                    <React.Fragment key={`${step.id}-${index}`}>
                      {showDueMarker && (
                        <div className="relative flex items-center gap-2 py-1">
                          <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                            <CalendarDays className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                            Due date
                          </span>
                        </div>
                      )}

                      <div className="relative flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/70 px-1.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <span
                          className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white dark:bg-zinc-900 ${
                            beforeDue
                              ? 'border-purple-400 text-purple-600 dark:text-purple-300'
                              : 'border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                          {formatStepTiming(step.day)}
                        </span>
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          {meta.shortLabel}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-3 border-t border-zinc-200 pt-2 font-mono text-[10px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {counts.email}E · {counts.whatsapp}WA · {counts.voice}Call = {totalCount(counts)} total
          </div>
        </div>
      </div>
    </div>
  );
};
