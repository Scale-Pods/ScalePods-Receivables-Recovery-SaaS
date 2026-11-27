export type OutreachChannel = 'email' | 'whatsapp' | 'voice';

export interface OutreachDateInfo {
  raw: string;
  sent: boolean;
  date: string;
}

export interface OutreachDeliveryFields {
  channel: OutreachChannel;
  index: number;
  rawDate: string;
  sentDate: string;
  sent: boolean;
  contentHtml: string;
}

export const CHANNEL_PREFIXES: Readonly<Record<OutreachChannel, string>>;

export function parseOutreachDate(value: unknown): OutreachDateInfo;

export function collectStepDeliveries(
  row: unknown,
  channels: readonly OutreachChannel[],
  counts: Record<OutreachChannel, number>
): OutreachDeliveryFields[];
