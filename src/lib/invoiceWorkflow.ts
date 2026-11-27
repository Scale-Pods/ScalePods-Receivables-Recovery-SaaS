/**
 * Client bridge for the in-code replacement of the invoice n8n workflow.
 *
 * Extraction never writes to Supabase. The server returns a short-lived signed
 * draft token; Supabase insert + date generation only happen on explicit approval.
 */

export interface ExtractedInvoiceDraft {
  party_name: string | null;
  customer_name: string | null;
  customer_email: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  bill_no: string | null;
  voucher_no: string | null;
  transaction_date: string | null;
  due_date: string | null;
  /** 'due_date' when printed on the invoice, 'payment_terms' when derived from credit days. */
  due_date_source?: 'due_date' | 'payment_terms' | null;
  payment_terms?: string | null;
  payment_terms_days?: number | null;
  overdue_amount: number | null;
  running_balance: number | null;
  debit: number | null;
  credit: number | null;
  Final_Amount: number | null;
  Payment_Date: string | null;
  current_stage: string | null;
  next_action: string | null;
  status: string | null;
  dispute: string | null;
  founder_review: string | null;
  /** Drives the Approvals queue; empty means the invoice is not queued. */
  Escalation?: string | null;
  cycle_started_date: string | null;
  oldest_due_date: string | null;
  max_overdue_days: number | null;
  sentiment: string | null;
  sentiment_score: number | null;
  intent: string | null;
  summary: string | null;
}

export interface ExtractDuplicateInfo {
  id: string | number;
  bill_no?: string | null;
  gstin?: string | null;
}

export interface InvoiceSchedulePreview {
  start_date: string;
  next_action: string | null;
  next_action_date: string | null;
  steps: ScheduledSequenceStep[];
  sequence: unknown[];
  source: string;
}

export interface InvoiceExtractionResult {
  success: boolean;
  draftToken: string;
  extracted: ExtractedInvoiceDraft;
  duplicate: ExtractDuplicateInfo | null;
  schedule_preview?: InvoiceSchedulePreview;
  expiresInMinutes: number;
}

export interface ScheduledSequenceStep {
  id?: string;
  day: number;
  stage: string;
  channels: string[];
  headline: string;
  scheduled_date: string;
}

export interface InvoiceApprovalResult {
  success: boolean;
  inserted: boolean;
  duplicate: boolean;
  message?: string;
  row?: Record<string, any>;
  extracted?: ExtractedInvoiceDraft;
  start_date?: string;
  next_action?: string;
  next_action_date?: string;
  scheduled_steps?: ScheduledSequenceStep[];
  sequence_source?: string;
}

export type InvoiceDocumentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: 'image/webp' | 'image/jpeg' | 'image/png'; data: string };

export interface InvoiceExtractionRequest {
  /** Raw file bytes are only used when no pre-compressed blocks are supplied. */
  fileBase64?: string;
  /** Browser-prepared text/image blocks, kept under the serverless body limit. */
  documentBlocks?: InvoiceDocumentBlock[];
  fileName: string;
  fileType: string;
  debtorEmail: string;
  debtorPhone: string;
  customer_uid?: string;
  userEmail: string;
  userTier: string;
  userName?: string;
  userCompany?: string;
  cycleStartedDate?: string | null;
  sequence?: unknown[];
  totalDays?: number;
}

export interface SequenceSaveRequest {
  userEmail: string;
  customer_uid?: string;
  tier: string;
  totalDays: number;
  sequence: unknown[];
}

/**
 * Serverless hosts (e.g. Vercel) reject request bodies above ~4.5 MB. This is
 * the base64 payload budget used by the browser-side compressor; raw files are
 * decoded/re-encoded here before they ever reach the API.
 */
export const MAX_INVOICE_FILE_BYTES = 3 * 1024 * 1024;

export function formatFileSizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    if (response.status === 413) {
      throw new Error('Invoice is too large to upload even after compression. Try a smaller file or fewer pages.');
    }
    throw new Error(data?.message || data?.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function extractInvoiceWithWorkflow(
  request: InvoiceExtractionRequest
): Promise<InvoiceExtractionResult> {
  return postJson<InvoiceExtractionResult>('/api/invoice-extract', request);
}

export async function approveInvoiceDraft(
  draftToken: string,
  edits: Partial<ExtractedInvoiceDraft>
): Promise<InvoiceApprovalResult> {
  return postJson<InvoiceApprovalResult>('/api/invoice-approve', { draftToken, edits });
}

export async function saveSequenceToSupabase(request: SequenceSaveRequest): Promise<{ success: boolean; steps: number }> {
  return postJson<{ success: boolean; steps: number }>('/api/sequence-save', request);
}

/**
 * Reads the user's locally saved cadence so date generation can still use their
 * chosen sequence if the Supabase Credentials row has not been synced yet.
 */
export function readStoredSequence(userId?: string): { sequence: unknown[]; totalDays: number } | null {
  try {
    const scopedKey = userId ? `recovr_custom_sequence_${userId}` : null;
    const scopedDaysKey = userId ? `recovr_sequence_total_days_${userId}` : null;
    const raw =
      (scopedKey && localStorage.getItem(scopedKey)) ||
      localStorage.getItem('recovr_custom_sequence');
    const rawDays =
      (scopedDaysKey && localStorage.getItem(scopedDaysKey)) ||
      localStorage.getItem('recovr_sequence_total_days');

    if (!raw) return null;
    const sequence = JSON.parse(raw);
    if (!Array.isArray(sequence) || sequence.length === 0) return null;
    return {
      sequence,
      totalDays: Math.max(1, Number(rawDays) || 21),
    };
  } catch {
    return null;
  }
}
