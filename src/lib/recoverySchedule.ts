/**
 * Client-side mirror of the server recovery-date generator.
 *
 * This is preview-only: approval always regenerates the schedule on the server.
 * Keeping the same normalization/date rules here makes the intake preview match
 * what will actually be inserted into Supabase.
 */

export type RecoveryChannel = 'email' | 'whatsapp' | 'voice';

export interface NormalizedRecoverySequenceStep {
  id?: string;
  /** Positive days are days overdue; negative days fall before the due date. */
  day: number;
  phase?: 'before_due' | 'after_due';
  stage: string;
  channels: RecoveryChannel[];
  headline: string;
}

export interface ScheduledRecoveryStep extends NormalizedRecoverySequenceStep {
  scheduled_date: string;
}

export interface RecoverySchedulePreview {
  startDate: string;
  firstStep: ScheduledRecoveryStep | null;
  steps: ScheduledRecoveryStep[];
}

const defaultRecoverySequence: NormalizedRecoverySequenceStep[] = [
  { day: 1, stage: 'Friendly', channels: ['email'], headline: 'Day 1 Friendly Payment Reminder' },
  { day: 3, stage: 'Friendly', channels: ['whatsapp'], headline: 'Day 3 WhatsApp Quick Touch' },
  { day: 5, stage: 'Friendly', channels: ['email'], headline: 'Day 5 GST Statement Recheck' },
  { day: 8, stage: 'Firm', channels: ['email', 'whatsapp'], headline: 'Day 8 Overdue Notice' },
  { day: 10, stage: 'Firm', channels: ['whatsapp'], headline: 'Day 10 Instalment Offer' },
  { day: 12, stage: 'Escalation', channels: ['voice', 'whatsapp'], headline: 'Day 12 Voice AI Escalation' },
  { day: 14, stage: 'Escalation', channels: ['email', 'whatsapp'], headline: 'Day 14 Credit Terms Review' },
  { day: 17, stage: 'Final Blitz', channels: ['voice', 'whatsapp', 'email'], headline: 'Day 17 Final Blitz' },
  { day: 19, stage: 'Final Blitz', channels: ['voice', 'whatsapp'], headline: 'Day 19 Executive Escalation' },
  { day: 21, stage: 'Final Blitz', channels: ['voice', 'whatsapp', 'email'], headline: 'Day 21 Sequence Concludes' },
];

export { defaultRecoverySequence };

function asText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed && trimmed.toLowerCase() !== 'null' ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const str = String(value).trim();
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const indian = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (indian) {
    const [, day, month, rawYear] = indian;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = Date.parse(str);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

function todayInKolkata(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const match = parts.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: unknown, days: number): string {
  const base = normalizeDate(dateStr) || todayInKolkata();
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export function formatRecoveryStepTiming(day: number): string {
  if (day > 0) return `Day ${day}`;
  const weeks = Math.abs(day) / 7;
  if (Number.isInteger(weeks) && weeks >= 1) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} before due date`;
  }
  return `${Math.abs(day)} days before due date`;
}

/** Compact badge used in the schedule list. */
export function formatRecoveryStepBadge(day: number): string {
  if (day > 0) return `D${day}`;
  const weeks = Math.abs(day) / 7;
  if (Number.isInteger(weeks) && weeks >= 1) return `${weeks}w before`;
  return `${Math.abs(day)}d before`;
}

function normalizeChannel(value: unknown): RecoveryChannel | null {
  const channel = String(value || '')
    .toLowerCase()
    .trim();
  if (['whatsapp', 'wa'].includes(channel)) return 'whatsapp';
  if (['email', 'mail'].includes(channel)) return 'email';
  if (['voice', 'call', 'voice_call', 'voice call'].includes(channel)) return 'voice';
  return null;
}

export function normalizeRecoverySequence(sequence: unknown): NormalizedRecoverySequenceStep[] {
  const raw = Array.isArray(sequence) && sequence.length > 0 ? sequence : defaultRecoverySequence;

  return raw
    .map((step: any): NormalizedRecoverySequenceStep | null => {
      const day = Number(step?.day);
      // Day 0 is not a valid touch: positive days are overdue, negative days pre-date the due date.
      if (!Number.isFinite(day) || day === 0) return null;
      const channels = [...new Set(
        ((Array.isArray(step?.channels) ? step.channels : []) as unknown[])
          .map((channel) => normalizeChannel(channel))
          .filter((channel): channel is RecoveryChannel => Boolean(channel))
      )];

      const roundedDay = Math.round(day);
      return {
        ...(asText(step?.id) ? { id: asText(step?.id) as string } : {}),
        ...(step?.phase === 'before_due' ? { phase: 'before_due' as const } : {}),
        day: roundedDay,
        stage: asText(step?.stage) || 'Friendly',
        channels: channels.length > 0 ? channels : (['email'] as RecoveryChannel[]),
        headline:
          asText(step?.headline) ||
          (roundedDay < 0 ? formatRecoveryStepTiming(roundedDay) : `Day ${roundedDay}`) +
            ' Recovery Touch',
      };
    })
    .filter((step): step is NormalizedRecoverySequenceStep => Boolean(step))
    .sort((a, b) => a.day - b.day);
}

/**
 * Day 1 is the first day after the due date, so a step with day = -7 lands one
 * week before it. If no due date exists yet, a legacy cycle start date (or
 * today) is used so the preview stays useful.
 */
export function getRecoveryStartDate(dueDate?: unknown, cycleStartedDate?: unknown): string {
  const due = normalizeDate(dueDate);
  if (due) return addDays(due, 1);
  return normalizeDate(cycleStartedDate) || todayInKolkata();
}

export function buildRecoverySchedulePreview(
  sequence: unknown,
  dueDate?: unknown,
  cycleStartedDate?: unknown
): RecoverySchedulePreview {
  const steps = normalizeRecoverySequence(sequence);
  const startDate = getRecoveryStartDate(dueDate, cycleStartedDate);
  const scheduledSteps = steps.map((step) => ({
    ...step,
    scheduled_date: addDays(startDate, step.day - 1),
  }));

  return {
    startDate,
    steps: scheduledSteps,
    firstStep: scheduledSteps[0] || null,
  };
}
