import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';
const DRAFT_TTL_MS = 30 * 60 * 1000;
// Serverless platforms (e.g. Vercel) cap request bodies at ~4.5 MB. Base64
// inflates file bytes by ~33%, so keep the accepted file size well below that.
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const DRAFT_VERSION = 1;

const EXTRACTION_PROMPT = `# SYSTEM PROMPT: INVOICE DATA EXTRACTION AGENT

You are an advanced Invoice Information Extraction AI for an Accounts Receivable and Payment Recovery Management System.

Your task is to analyze uploaded invoices, GST invoices, tax invoices, commercial invoices, scanned documents and PDF invoice files.

Extract all relevant information accurately and return ONLY valid JSON.

Do not generate explanations, markdown, comments or additional text.

## 1. CUSTOMER INFORMATION

Extract the following:

- party_name: Legal business name of the buyer/customer.
- email: Customer's email address.
- customer_email: Customer's email address.
- phone: Customer's phone/mobile number.
- gstin: Buyer's GSTIN, NOT the seller's GSTIN.

IMPORTANT:
- Identify buyer and seller carefully.
- The supplier/issuer of the invoice is NOT the debtor.
- Extract customer details from the Bill To / Buyer / Billed To section.
- Do not use seller contact information as customer information.
- If multiple contact numbers or emails exist, prioritize buyer contact information.

## 2. INVOICE INFORMATION

Extract:

- bill_no: Invoice number / Tax Invoice Number / Document Number.
- voucher_no: Voucher number, if separately mentioned.
- transaction_date: Invoice date in YYYY-MM-DD format.
- oldest_due_date: Payment due date in YYYY-MM-DD format, only if explicitly printed.
- payment_terms: Payment terms exactly as printed, if any (for example "Net 30", "Payment within 15 days", "Credit period: 45 days", "Due on receipt").
- payment_terms_days: Number of days from the invoice date allowed for payment, only when the printed terms state a day count.

Rules:
- Do not confuse invoice date with delivery date or purchase order date.
- If an explicit due date is printed, use it for oldest_due_date.
- If no due date is printed but the terms state a number of days, leave oldest_due_date empty and return the terms text plus payment_terms_days. The server calculates the due date from the invoice date.
- For "2/10 Net 30", payment_terms_days is 30 — ignore the early-payment discount period.
- For "Due on receipt" or "immediate", payment_terms_days is 0.
- Never invent invoice numbers or dates.

## 3. FINANCIAL INFORMATION

Extract:

- Final_Amount: Final invoice amount payable, including applicable taxes and charges.
- overdue_amount: Outstanding amount only if explicitly mentioned.
- running_balance: Remaining unpaid balance, if explicitly available.
- debit: Debit amount, if explicitly mentioned.
- credit: Credit amount, if explicitly mentioned.

Financial extraction rules:

1. Final_Amount:
   - Extract the final grand total / net payable amount.
   - Include GST, freight, handling and other applicable charges.
   - Prefer the final payable amount over taxable value.

2. overdue_amount:
   - Extract only when the document explicitly identifies an overdue or outstanding amount.
   - Do not automatically consider every invoice overdue.

3. running_balance:
   - Extract the balance outstanding after adjustments or payments, if explicitly shown.

4. debit:
   - Extract the debit amount only if explicitly available.

5. credit:
   - Extract the credit amount only if explicitly available.

6. Never assume that the invoice has been paid or unpaid based only on its existence.

7. Do not calculate missing financial values unless the document provides sufficient information and the calculation is unambiguous.

## 4. ADDITIONAL INFORMATION

Extract:

- summary: A concise summary containing the invoice number, buyer name, seller name, invoice date, payment due date, final payable amount, and any explicitly stated overdue/outstanding status. Do not speculate.
- sentiment: Only if a recorded debtor sentiment is explicitly present.
- sentiment_score: Only if explicitly present.
- intent: Only if explicitly present.
- status, dispute, founder_review, current_stage, next_action, cycle_started_date, max_overdue_days: Only if explicitly present.

## OUTPUT FORMAT

Return ONE valid JSON object with this exact shape and nothing else:
{
  "party_name": string | null,
  "email": string | null,
  "customer_email": string | null,
  "phone": string | null,
  "gstin": string | null,
  "bill_no": string | null,
  "voucher_no": string | null,
  "transaction_date": string | null,
  "due_date": string | null,
  "oldest_due_date": string | null,
  "payment_terms": string | null,
  "payment_terms_days": number | null,
  "Final_Amount": number | null,
  "overdue_amount": number | null,
  "running_balance": number | null,
  "debit": number | null,
  "credit": number | null,
  "Payment_Date": string | null,
  "current_stage": string | null,
  "next_action": string | null,
  "status": string | null,
  "dispute": string | null,
  "founder_review": string | null,
  "cycle_started_date": string | null,
  "max_overdue_days": number | null,
  "sentiment": string | null,
  "sentiment_score": number | null,
  "intent": string | null,
  "summary": string | null
}

Final rules:
- Dates must be YYYY-MM-DD.
- Amounts must be plain numbers without currency symbols or commas.
- Use null for every field that is not explicitly present in the document.
- "party_name" is the buyer/debtor company, never the seller/issuer.
- "gstin" is the buyer's GSTIN, never the seller's GSTIN.`;

const RISK_PROMPT = `You are a conservative credit-risk analyst for Indian B2B receivables.
Use ONLY the provided facts. Do not invent details.
Return one valid JSON object and nothing else:
{"risk_score": <integer 0-100 where 100 means lowest risk>, "risk_reason": "<one factual sentence, max 180 characters>"}`;

const DEFAULT_SEQUENCE = [
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

function envValue(env, key) {
  return env?.[key] || process.env[key] || '';
}

function cors(res) {
  res.setHeader?.('Access-Control-Allow-Credentials', 'true');
  res.setHeader?.('Access-Control-Allow-Origin', '*');
  res.setHeader?.('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader?.(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Content-Length, Authorization, X-Api-Version'
  );
}

function sendJson(res, status, payload) {
  cors(res);
  res.statusCode = status;
  res.setHeader?.('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

function getSupabaseClient(env) {
  const url = envValue(env, 'SUPABASE_URL') || envValue(env, 'VITE_SUPABASE_URL');
  const key =
    envValue(env, 'SUPABASE_SERVICE_ROLE_KEY') ||
    envValue(env, 'SUPABASE_ANON_KEY') ||
    envValue(env, 'VITE_SUPABASE_ANON_KEY');

  if (!url || !key) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getSigningSecret(env) {
  const secret =
    envValue(env, 'DRAFT_SIGNING_SECRET') ||
    envValue(env, 'SUPABASE_SERVICE_ROLE_KEY') ||
    envValue(env, 'ANTHROPIC_API_KEY');

  if (!secret) {
    throw new Error('Draft signing is not configured. Set DRAFT_SIGNING_SECRET.');
  }
  return secret;
}

function toBase64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signDraft(payload, secret) {
  const body = toBase64Url(payload);
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyDraft(token, secret) {
  if (typeof token !== 'string' || token.split('.').length !== 2) {
    throw new Error('Invalid approval token.');
  }

  const [body, signature] = token.split('.');
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Approval token signature is invalid.');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (payload?.v !== DRAFT_VERSION || !payload?.exp || Date.now() > payload.exp) {
    throw new Error('This extraction preview has expired. Please extract the invoice again.');
  }
  return payload;
}

function cleanBase64(value) {
  return String(value || '')
    .replace(/^data:[^;]+;base64,/, '')
    .replace(/\s/g, '');
}

function normalizeMediaType(fileType, fileName) {
  const type = String(fileType || '').toLowerCase().trim();
  if (type) return type.split(';')[0];
  const ext = String(fileName || '').toLowerCase().split('.').pop();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'txt') return 'text/plain';
  return 'application/octet-stream';
}

function buildDocumentBlocks(base64, mediaType, fileName) {
  if (mediaType === 'application/pdf') {
    return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }];
  }
  if (mediaType.startsWith('image/')) {
    return [{ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }];
  }
  if (mediaType === 'text/csv' || mediaType === 'text/plain' || mediaType === 'application/csv') {
    const text = Buffer.from(base64, 'base64').toString('utf8').slice(0, 200000);
    return [{ type: 'text', text: `Invoice text from ${fileName || 'uploaded file'}:\n${text}` }];
  }
  throw new Error('Unsupported file type. Use a PDF, image, CSV, or TXT invoice.');
}

/** Accepts the small blocks prepared by the browser; never trusts arbitrary shapes. */
export function normalizePreparedBlocks(value) {
  if (!Array.isArray(value) || !value.length) return null;

  const blocks = value.slice(0, 12).map((block) => {
    if (!block || typeof block !== 'object') return null;
    if (block.type === 'text' && typeof block.text === 'string') {
      return { type: 'text', text: block.text.slice(0, 200000) };
    }
    if (
      block.type === 'image' &&
      /^image\/(webp|jpeg|png)$/.test(String(block.mediaType || '')) &&
      typeof block.data === 'string'
    ) {
      const data = cleanBase64(block.data);
      if (data) {
        return { type: 'image', source: { type: 'base64', media_type: block.mediaType, data } };
      }
    }
    return null;
  }).filter(Boolean);

  return blocks.length ? blocks : null;
}

async function callAnthropic(env, base64, mediaType, fileName, preparedBlocks = null) {
  const apiKey = envValue(env, 'ANTHROPIC_API_KEY') || envValue(env, 'VITE_ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server.');
  }

  const model = envValue(env, 'ANTHROPIC_MODEL') || DEFAULT_ANTHROPIC_MODEL;
  const blocks = preparedBlocks || buildDocumentBlocks(base64, mediaType, fileName);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      messages: [{ role: 'user', content: [...blocks, { type: 'text', text: EXTRACTION_PROMPT }] }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || data?.message || `Anthropic request failed (${response.status})`;
    throw new Error(message);
  }

  const text = (data?.content || [])
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();

  if (!text) throw new Error('Anthropic returned an empty extraction response.');
  return text;
}

function parseModelJson(text) {
  const cleaned = String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error('Anthropic did not return valid JSON for this invoice.');
  }
}

function asText(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed && trimmed.toLowerCase() !== 'null' ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function asNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[₹$,\s]/g, '');
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);

  const str = String(value).trim();
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const indian = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (indian) {
    const [, d, m, yRaw] = indian;
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = Date.parse(str);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

export function todayInKolkata() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const match = parts.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : new Date().toISOString().slice(0, 10);
}

export function addDaysToDate(dateStr, days) {
  const base = normalizeDate(dateStr) || todayInKolkata();
  const date = new Date(`${base}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function clampTermDays(raw) {
  const days = Number(raw);
  return Number.isFinite(days) && days >= 0 && days <= 365 ? Math.round(days) : null;
}

/**
 * Reads a credit-period length from printed payment terms: "Net 30",
 * "2/10 Net 30", "payment within 15 days", "credit period: 45 days", "N/60".
 * Returns null when the terms cannot be converted unambiguously.
 */
export function parsePaymentTermsDays(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return clampTermDays(value);

  const text = String(value).toLowerCase().trim();
  if (!text) return null;

  if (/\b(due on receipt|due immediately|immediate(?:ly)?|cash on delivery|cash in advance|advance payment|cod)\b/.test(text)) {
    return 0;
  }

  // Prefer the net period over an early-payment discount window ("2/10 Net 30").
  const net = text.match(/\b(?:net|n)[\s/-]*(\d{1,3})\b/);
  if (net) return clampTermDays(net[1]);

  const days = text.match(/\b(\d{1,3})\s*(?:calendar\s+|working\s+|business\s+)?days?\b/);
  if (days) return clampTermDays(days[1]);

  const plain = text.match(/^(\d{1,3})$/);
  return plain ? clampTermDays(plain[1]) : null;
}

/**
 * Recovery cadence days are "days overdue" (Day 1 = the day after the due date).
 * Negative days are pre-due touches, so day -7 lands one week before the due date.
 * The due date always wins; a legacy cycle start date is only a fallback.
 */
export function getScheduleStartDate({ dueDate, cycleStartedDate } = {}) {
  const due = normalizeDate(dueDate);
  if (due) return addDaysToDate(due, 1);
  return normalizeDate(cycleStartedDate) || todayInKolkata();
}

export function normalizeExtracted(raw, context = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const amount =
    asNumber(source.overdue_amount ?? source.amount ?? source.total_amount ?? source.Final_Amount ?? source.running_balance ?? source.debit) ??
    null;
  const transactionDate = normalizeDate(source.transaction_date ?? source.issueDate ?? source.invoice_date);
  const explicitDueDate = normalizeDate(source.due_date ?? source.dueDate ?? source.oldest_due_date);
  const termsDays = parsePaymentTermsDays(
    source.payment_terms_days ??
      source.paymentTermsDays ??
      source.payment_terms ??
      source.paymentTerms ??
      source.credit_period ??
      source.credit_terms ??
      source.terms ??
      null
  );
  const termsBasedDueDate =
    transactionDate && termsDays !== null ? addDaysToDate(transactionDate, termsDays) : null;
  // Payment terms are a fallback: an explicit due date on the invoice always wins.
  const dueDate = explicitDueDate || termsBasedDueDate;
  // Keep the "calculated" label when the draft is re-normalized at approval time,
  // but drop it as soon as the user overrides the date.
  const dueDateSource = explicitDueDate
    ? termsBasedDueDate === explicitDueDate && source.due_date_source === 'payment_terms'
      ? 'payment_terms'
      : 'due_date'
    : termsBasedDueDate
      ? 'payment_terms'
      : null;

  return {
    party_name: asText(source.party_name ?? source.customerCompany ?? source.company_name ?? source.customer_name),
    customer_name: asText(source.customer_name ?? source.contactPerson ?? source.contact_name),
    customer_email: asText(context.customerEmail ?? source.customer_email ?? source.email ?? source.customerEmail),
    email: asText(context.customerEmail ?? source.email ?? source.customerEmail ?? source.customer_email),
    phone: asText(context.customerPhone ?? source.phone ?? source.customerPhone ?? source.customer_phone),
    gstin: asText(source.gstin ?? source.GSTIN ?? source.gst_number),
    bill_no: asText(source.bill_no ?? source.invoiceNumber ?? source.invoice_number ?? source.invNumber ?? source.invoiceNo),
    voucher_no: asText(source.voucher_no ?? source.voucherNo),
    transaction_date: transactionDate,
    due_date: dueDate,
    due_date_source: dueDateSource,
    payment_terms: asText(
      source.payment_terms ?? source.paymentTerms ?? source.credit_terms ?? source.credit_period ?? source.terms
    ),
    payment_terms_days: termsDays,
    overdue_amount: amount,
    running_balance: asNumber(source.running_balance ?? amount),
    debit: asNumber(source.debit ?? amount),
    credit: asNumber(source.credit ?? 0),
    Final_Amount: asNumber(source.Final_Amount ?? source.final_amount),
    Payment_Date: normalizeDate(source.Payment_Date ?? source.payment_date),
    current_stage: asText(source.current_stage ?? source.stage),
    next_action: asText(source.next_action),
    status: asText(source.status) || 'Active',
    dispute: asText(source.dispute) || 'no',
    founder_review: asText(source.founder_review) || 'no',
    cycle_started_date: normalizeDate(context.cycleStartedDate ?? source.cycle_started_date),
    oldest_due_date: dueDate || normalizeDate(source.oldest_due_date),
    max_overdue_days: asNumber(source.max_overdue_days),
    sentiment: asText(source.sentiment),
    sentiment_score: asNumber(source.sentiment_score),
    intent: asText(source.intent),
    summary: asText(source.summary),
  };
}

export function normalizeSequence(value) {
  let steps = value;
  if (typeof steps === 'string') {
    try {
      steps = JSON.parse(steps);
    } catch {
      steps = null;
    }
  }
  if (!Array.isArray(steps) && Array.isArray(steps?.sequence)) steps = steps.sequence;
  if (!Array.isArray(steps) && Array.isArray(value?.sequence)) steps = value.sequence;
  if (!Array.isArray(steps) || steps.length === 0) steps = DEFAULT_SEQUENCE;

  return steps
    .map((step) => {
      const day = Number(step?.day);
      // Day 0 is not a touch: positive days are overdue, negative days are pre-due.
      if (!Number.isFinite(day) || day === 0) return null;
      const channelsRaw = Array.isArray(step?.channels) ? step.channels : [];
      const channels = [...new Set(channelsRaw.map(normalizeChannel).filter(Boolean))];
      const roundedDay = Math.round(day);
      return {
        ...step,
        day: roundedDay,
        stage: asText(step?.stage) || 'Friendly',
        channels: channels.length ? channels : ['email'],
        headline:
          asText(step?.headline) ||
          `${roundedDay < 0 ? `${Math.abs(roundedDay)} days before due date` : `Day ${roundedDay}`} Recovery Touch`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.day - b.day);
}

function normalizeChannel(channel) {
  const value = String(channel || '').toLowerCase().trim();
  if (['whatsapp', 'wa'].includes(value)) return 'whatsapp';
  if (['email', 'mail'].includes(value)) return 'email';
  if (['voice', 'call', 'voice_call', 'voice call'].includes(value)) return 'voice';
  return null;
}

export function generateSchedule(sequence, startDate) {
  const steps = normalizeSequence(sequence);
  const counters = { email: 0, whatsapp: 0, voice: 0 };
  const rowDates = {};
  const scheduledSteps = [];

  for (const step of steps) {
    const scheduledDate = addDaysToDate(startDate, step.day - 1);
    for (const channel of step.channels) {
      counters[channel] += 1;
      const index = Math.min(counters[channel], 10);
      const prefix = channel === 'whatsapp' ? 'wa' : channel === 'voice' ? 'call' : channel;
      rowDates[`${prefix}_${index}_date`] = scheduledDate;
    }
    scheduledSteps.push({ ...step, scheduled_date: scheduledDate });
  }

  return {
    rowDates,
    scheduledSteps,
    firstStep: scheduledSteps[0] || null,
  };
}

function duplicateAccountScopes(context) {
  const uid = asText(context?.customer_uid ?? context?.customerUid ?? context?.userId ?? context?.clientId);
  const email = asText(context?.userEmail)
    .toLowerCase()
    .trim();

  const scopes = [];
  if (uid) scopes.push({ column: 'customer_uid', value: uid });
  if (email) scopes.push({ column: 'customer_email', value: email });
  return scopes;
}

async function runDuplicateLookup(supabase, extracted, context, strict) {
  const billNo = asText(extracted?.bill_no);
  if (!billNo) return null;

  // Never run a global gstin + bill_no lookup. The same invoice can exist under
  // different accounts, so the logged-in account must always be part of the key.
  const scopes = duplicateAccountScopes(context);
  if (!scopes.length) return null;

  const gstin = asText(extracted?.gstin);

  for (const scope of scopes) {
    let query = supabase
      .from('recovery_outreach')
      .select('id,bill_no,gstin,customer_uid,customer_email')
      .eq('bill_no', billNo)
      .eq(scope.column, scope.value);
    if (gstin) query = query.eq('gstin', gstin);

    const { data, error } = await query.limit(1).maybeSingle();
    if (error) {
      if (strict) throw new Error(`Duplicate check failed: ${error.message}`);
      console.warn('Duplicate invoice lookup warning:', error.message);
      continue;
    }
    if (data) return data;
  }

  return null;
}

export async function findDuplicate(supabase, extracted, context) {
  return runDuplicateLookup(supabase, extracted, context, false);
}

export async function findDuplicateStrict(supabase, extracted, context) {
  return runDuplicateLookup(supabase, extracted, context, true);
}

async function loadSequence(supabase, context, fallback) {
  let row = null;
  const email = context?.userEmail ? String(context.userEmail).toLowerCase().trim() : '';
  const uid = context?.customer_uid ? String(context.customer_uid) : '';

  if (email) {
    const byEmail = await supabase
      .from('Credentials')
      .select('*')
      .eq('Email', email)
      .maybeSingle();
    if (!byEmail.error && byEmail.data) row = byEmail.data;

    if (!row) {
      const byLowerEmail = await supabase
        .from('Credentials')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (!byLowerEmail.error && byLowerEmail.data) row = byLowerEmail.data;
    }
  }

  if (!row && uid) {
    const byUid = await supabase
      .from('Credentials')
      .select('*')
      .eq('uid', uid)
      .maybeSingle();
    if (!byUid.error && byUid.data) row = byUid.data;
  }

  return {
    sequence: normalizeSequence(row?.Sequence || row?.sequence || fallback || DEFAULT_SEQUENCE),
    tier: asText(row?.Tier || row?.tier) || context?.userTier || 'free',
    uid: asText(row?.uid || row?.customer_uid) || uid || null,
    source: row ? 'Credentials' : 'fallback',
  };
}

async function callAnthropicRisk(env, extracted, history) {
  const apiKey = envValue(env, 'ANTHROPIC_API_KEY') || envValue(env, 'VITE_ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  const payload = {
    invoice: {
      gstin: extracted.gstin,
      amount: extracted.overdue_amount,
      max_overdue_days: extracted.max_overdue_days,
      dispute: extracted.dispute,
      sentiment: extracted.sentiment,
      sentiment_score: extracted.sentiment_score,
      summary: extracted.summary,
    },
    historical_records: history.map((row) => ({
      status: row?.status || null,
      dispute: row?.dispute || null,
      max_overdue_days: row?.max_overdue_days || null,
      risk_score: row?.risk_score || null,
    })),
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: envValue(env, 'ANTHROPIC_MODEL') || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `${RISK_PROMPT}\n\nFacts:\n${JSON.stringify(payload)}` },
          ],
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Risk request failed (${response.status})`);

  const text = (data?.content || [])
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('\n');
  const parsed = parseModelJson(text);
  const score = asNumber(parsed?.risk_score);

  return {
    risk_score: score === null ? null : Math.max(0, Math.min(100, Math.round(score))),
    risk_reason: asText(parsed?.risk_reason),
  };
}

async function calculateRisk(supabase, extracted, env) {
  let history = [];
  if (extracted.gstin) {
    const { data, error } = await supabase
      .from('recovery_outreach')
      .select('id,status,dispute,max_overdue_days,risk_score')
      .eq('gstin', extracted.gstin)
      .limit(25);
    if (!error && Array.isArray(data)) history = data;
  }

  let score = 82;
  const reasons = [];

  if (history.length > 0) {
    score -= Math.min(15, history.length * 3);
    reasons.push(`${history.length} prior recovery record(s) for this GSTIN`);
  }
  if (history.some((row) => String(row?.dispute || '').toLowerCase() === 'yes')) {
    score -= 25;
    reasons.push('prior dispute recorded');
  }
  const worstOverdue = history.reduce((max, row) => Math.max(max, Number(row?.max_overdue_days || 0)), 0);
  if (worstOverdue >= 45) {
    score -= 12;
    reasons.push(`prior overdue peak of ${worstOverdue} days`);
  }
  const extractedOverdue = Number(extracted.max_overdue_days || 0);
  if (extractedOverdue >= 45) {
    score -= 10;
    reasons.push(`invoice already ${extractedOverdue} days overdue`);
  }
  const sentiment = String(extracted.sentiment || '').toLowerCase();
  if (['negative', 'urgent', 'evasive'].includes(sentiment)) {
    score -= 8;
    reasons.push(`debtor sentiment: ${sentiment}`);
  }

  score = Math.max(10, Math.min(99, Math.round(score)));
  const fallback = {
    risk_score: score,
    risk_reason:
      reasons.length > 0
        ? `Risk adjusted for ${reasons.join('; ')}.`
        : 'No adverse historical signals found for this GSTIN; baseline risk applied.',
  };

  try {
    const aiRisk = await callAnthropicRisk(env, extracted, history);
    if (aiRisk?.risk_score !== null && aiRisk?.risk_score !== undefined && aiRisk?.risk_reason) {
      return { risk_score: aiRisk.risk_score, risk_reason: aiRisk.risk_reason };
    }
  } catch (error) {
    console.warn('AI risk scoring unavailable, using deterministic fallback:', error.message);
  }

  return fallback;
}

export function buildRecoveryRow({
  extracted,
  context,
  sequenceInfo,
  schedule,
  risk,
  startDate: explicitStartDate,
}) {
  const first = schedule.firstStep;
  const amount = Number(extracted.overdue_amount || 0);
  const startDate =
    normalizeDate(explicitStartDate) ||
    addDaysToDate(extracted.cycle_started_date || context?.cycleStartedDate, 0);

  return {
    party_name: extracted.party_name || 'Unspecified Client',
    email: extracted.email || '',
    phone: extracted.phone || '',
    gstin: extracted.gstin || null,
    bill_no: extracted.bill_no || `INV-${Date.now().toString().slice(-6)}`,
    voucher_no: extracted.voucher_no || null,
    transaction_date: extracted.transaction_date || null,
    oldest_due_date: extracted.oldest_due_date || extracted.transaction_date || null,
    overdue_amount: String(amount),
    running_balance: String(Number(extracted.running_balance ?? amount)),
    debit: String(Number(extracted.debit ?? amount)),
    credit: String(Number(extracted.credit ?? 0)),
    Final_Amount: extracted.Final_Amount ?? null,
    Payment_Date: extracted.Payment_Date || null,
    current_stage: first?.stage || extracted.current_stage || 'Friendly',
    next_action: first?.headline || extracted.next_action || 'Day 1 Friendly Reminder',
    next_action_date: first?.scheduled_date || startDate,
    status: 'Active',
    dispute: extracted.dispute || 'no',
    founder_review: extracted.founder_review || 'no',
    cycle_started_date: startDate,
    max_overdue_days: String(Number(extracted.max_overdue_days || 0)),
    customer_name: context?.userCompany || context?.userName || null,
    customer_email: context?.userEmail ? String(context.userEmail).toLowerCase().trim() : null,
    customer_uid: context?.customer_uid || null,
    plan_tier: context?.userTier || 'free',
    sentiment: extracted.sentiment || null,
    sentiment_score: extracted.sentiment_score ?? null,
    intent: extracted.intent || null,
    summary: extracted.summary || null,
    closed: 'no',
    risk_score: risk.risk_score,
    risk_reason: risk.risk_reason,
    email_conversation: null,
    wa_conversation: null,
    custom_sequence_config: JSON.stringify({
      totalDays: Math.max(...schedule.scheduledSteps.map((step) => step.day), 0),
      sequence: schedule.scheduledSteps,
      source: sequenceInfo.source,
      tier: sequenceInfo.tier,
    }),
    ...schedule.rowDates,
    updated_at: new Date().toISOString(),
  };
}

async function handleExtract(req, res, env) {
  const body = await readJsonBody(req);
  const preparedBlocks = normalizePreparedBlocks(body.documentBlocks);
  const base64 = cleanBase64(body.fileBase64);

  // Browser-compressed uploads arrive as text/image blocks instead of the raw
  // file, so they bypass the 3 MB base64 payload limit.
  if (!preparedBlocks && !base64) throw new Error('Invoice file bytes are missing.');

  if (base64) {
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.length) throw new Error('Invoice file is empty.');
    if (bytes.length > MAX_FILE_BYTES) throw new Error('Invoice file exceeds the 3 MB limit.');
  }

  const context = {
    customerEmail: asText(body.customerEmail ?? body.debtorEmail),
    customerPhone: asText(body.customerPhone ?? body.debtorPhone),
    customer_uid: asText(body.customer_uid ?? body.customerUid ?? body.userId ?? body.clientId),
    userEmail: asText(body.userEmail),
    userTier: asText(body.userTier) || 'free',
    userName: asText(body.userName),
    userCompany: asText(body.userCompany),
    cycleStartedDate: normalizeDate(body.cycleStartedDate ?? body.cycle_started_date),
  };

  if (!context.userEmail) throw new Error('userEmail is required.');
  // Contacts may be absent at extraction time: bulk intake reads them from the
  // document (or leaves them blank for the user to fill in on the review card).

  const mediaType = normalizeMediaType(body.fileType, body.fileName);
  const modelText = await callAnthropic(env, base64, mediaType, body.fileName, preparedBlocks);
  const modelJson = parseModelJson(modelText);
  const extracted = normalizeExtracted(modelJson, context);

  const fallbackSequence = normalizeSequence(body.sequence || DEFAULT_SEQUENCE);
  const secret = getSigningSecret(env);
  let sequenceInfo = {
    sequence: fallbackSequence,
    tier: context.userTier || 'free',
    uid: context.customer_uid || null,
    source: 'fallback',
  };
  const draft = {
    v: DRAFT_VERSION,
    exp: Date.now() + DRAFT_TTL_MS,
    extracted,
    context,
    fallbackSequence,
    totalDays: Number(body.totalDays) || fallbackSequence.length,
  };

  let duplicate = null;
  try {
    const supabase = getSupabaseClient(env);
    try {
      sequenceInfo = await loadSequence(supabase, context, fallbackSequence);
    } catch (error) {
      console.warn('Saved sequence preview unavailable, using fallback:', error.message);
    }
    duplicate = await findDuplicate(supabase, extracted, context);
  } catch (error) {
    console.warn('Duplicate pre-check unavailable:', error.message);
  }

  const previewStartDate = getScheduleStartDate({
    dueDate: extracted.due_date,
    cycleStartedDate: context.cycleStartedDate,
  });
  const previewSchedule = generateSchedule(sequenceInfo.sequence, previewStartDate);

  return sendJson(res, 200, {
    success: true,
    draftToken: signDraft(draft, secret),
    extracted,
    duplicate: duplicate ? { id: duplicate.id, bill_no: duplicate.bill_no, gstin: duplicate.gstin } : null,
    schedule_preview: {
      start_date: previewStartDate,
      next_action: previewSchedule.firstStep?.headline || null,
      next_action_date: previewSchedule.firstStep?.scheduled_date || null,
      steps: previewSchedule.scheduledSteps,
      sequence: sequenceInfo.sequence,
      source: sequenceInfo.source,
    },
    expiresInMinutes: Math.round(DRAFT_TTL_MS / 60000),
  });
}

async function handleApprove(req, res, env) {
  const body = await readJsonBody(req);
  const secret = getSigningSecret(env);
  const draft = verifyDraft(body.draftToken, secret);
  // Context wins over the raw document, but a user correction made on the
  // approval preview wins over both.
  const baseExtracted = normalizeExtracted(draft.extracted, draft.context);
  const extracted = normalizeExtracted({ ...baseExtracted, ...(body.edits || {}) }, {});
  if (!extracted.email || !extracted.phone) {
    throw new Error('Customer email and phone are required before approval.');
  }
  const supabase = getSupabaseClient(env);

  const duplicate = await findDuplicateStrict(supabase, extracted, draft.context);
  if (duplicate) {
    return sendJson(res, 200, {
      success: false,
      inserted: false,
      duplicate: true,
      message: `Invoice ${extracted.bill_no || ''} already exists${duplicate.id ? ` (row ${duplicate.id})` : ''}. No new row was created.`,
      extracted,
    });
  }

  const sequenceInfo = await loadSequence(supabase, draft.context, draft.fallbackSequence);
  const startDate = getScheduleStartDate({
    dueDate: extracted.due_date,
    cycleStartedDate: extracted.cycle_started_date || draft.context.cycleStartedDate,
  });
  // Keep the persisted cycle start aligned with the due-date-derived schedule.
  extracted.cycle_started_date = startDate;
  const schedule = generateSchedule(sequenceInfo.sequence, startDate);
  const risk = await calculateRisk(supabase, extracted, env);
  const row = buildRecoveryRow({
    extracted,
    context: draft.context,
    sequenceInfo,
    schedule,
    risk,
    startDate,
  });

  const { data, error } = await supabase.from('recovery_outreach').insert([row]).select().single();
  if (error) {
    return sendJson(res, 500, {
      success: false,
      inserted: false,
      message: `Supabase insert failed: ${error.message}`,
    });
  }

  return sendJson(res, 200, {
    success: true,
    inserted: true,
    duplicate: false,
    row: data,
    extracted,
    start_date: startDate,
    next_action: row.next_action,
    next_action_date: row.next_action_date,
    scheduled_steps: schedule.scheduledSteps,
    sequence_source: sequenceInfo.source,
  });
}

async function handleSequenceSave(req, res, env) {
  const body = await readJsonBody(req);
  const email = asText(body.userEmail)?.toLowerCase().trim();
  const uid = asText(body.customer_uid ?? body.customerUid ?? body.userId);
  if (!email && !uid) throw new Error('userEmail or customer_uid is required.');

  const sequence = normalizeSequence(body.sequence || []);
  const payload = {
    Sequence: JSON.stringify(sequence),
    Tier: asText(body.tier) || 'free',
    uid: uid || null,
  };

  const supabase = getSupabaseClient(env);
  let update = null;
  if (email) update = await supabase.from('Credentials').update(payload).eq('Email', email).select('*');
  if ((!update || update.error || !update.data?.length) && email) {
    update = await supabase.from('Credentials').update(payload).eq('email', email).select('*');
  }
  if ((!update || update.error || !update.data?.length) && uid) {
    update = await supabase.from('Credentials').update(payload).eq('uid', uid).select('*');
  }
  if (!update || update.error) {
    throw new Error(update?.error?.message || 'Unable to update Credentials.Sequence.');
  }
  if (!update.data?.length) {
    throw new Error('No Credentials row was found for this user. Sequence was saved locally only.');
  }

  return sendJson(res, 200, {
    success: true,
    steps: sequence.length,
    totalDays: Number(body.totalDays) || Math.max(...sequence.map((step) => step.day)),
  });
}

export function createInvoiceWorkflowHandler(action) {
  return async function handler(req, res, env = process.env) {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      return res.end();
    }
    if (req.method !== 'POST') {
      return sendJson(res, 405, { success: false, message: 'Method not allowed' });
    }

    try {
      if (action === 'extract') return await handleExtract(req, res, env);
      if (action === 'approve') return await handleApprove(req, res, env);
      if (action === 'sequence') return await handleSequenceSave(req, res, env);
      return sendJson(res, 404, { success: false, message: 'Unknown workflow action' });
    } catch (error) {
      console.error(`Invoice workflow (${action}) error:`, error);
      return sendJson(res, 500, {
        success: false,
        message: error?.message || 'Invoice workflow failed.',
      });
    }
  };
}
