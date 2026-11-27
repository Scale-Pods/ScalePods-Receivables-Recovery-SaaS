/** Column prefixes used by recovery_outreach for each outreach channel. */
export const CHANNEL_PREFIXES = Object.freeze({
  email: 'email',
  whatsapp: 'wa',
  voice: 'call',
});

/**
 * Reads a saved outreach date cell. Automation may overwrite the date column
 * with a marker such as "date- done 2026-11-27 - Done", so we tolerate both a
 * plain ISO date and a human-readable completion marker.
 */
export function parseOutreachDate(value) {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!raw) return { raw: '', sent: false, date: '' };

  const match = raw.match(/\d{4}-\d{1,2}-\d{1,2}/);
  let date = '';
  if (match) {
    const [year, month, day] = match[0].split('-');
    date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return { raw, sent: /\bdone\b/i.test(raw), date };
}

/**
 * Collects the saved content/date pair for every channel attached to one
 * cadence step. `counts` is mutated so the nth email/WA/call lookup stays
 * correct across the whole sequence.
 */
export function collectStepDeliveries(row, channels, counts) {
  const deliveries = [];

  for (const channel of channels || []) {
    const prefix = CHANNEL_PREFIXES[channel];
    if (!prefix) continue;

    counts[channel] = (counts[channel] || 0) + 1;
    const index = Math.min(counts[channel], 10);
    const rawDate = row?.[`${prefix}_${index}_date`];
    const rawContent =
      row?.[`${prefix}_${index}_content`] ??
      row?.[`${prefix}_${index}_html`] ??
      '';
    const parsedDate = parseOutreachDate(rawDate);
    const contentHtml = rawContent === null || rawContent === undefined ? '' : String(rawContent);

    if (!parsedDate.raw && !contentHtml) continue;

    deliveries.push({
      channel,
      index,
      rawDate: parsedDate.raw,
      sentDate: parsedDate.date,
      sent: parsedDate.sent,
      contentHtml,
    });
  }

  return deliveries;
}
