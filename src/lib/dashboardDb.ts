import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Invoice, 
  CustomerProfile, 
  FocusItem, 
  PaymentRecord,
  PlanTier,
  InvoiceStatus,
  CustomerRiskTier,
  ChannelType,
  TimelineEvent,
  ProofFile
} from '../dashboard/types/dashboard';

// --------------------------------------------------------------------------
// Tier Table Resolution Helper
// --------------------------------------------------------------------------
export function getRecoveryTableName(tier?: PlanTier | string): string {
  const normalized = (tier || 'free').toLowerCase().trim();
  switch (normalized) {
    case 'basic':
      return 'recovery_outreach_basic';
    case 'growth':
      return 'recovery_outreach_growth';
    case 'enterprise':
      return 'recovery_outreach_enterprise';
    case 'free':
    default:
      return 'recovery_outreach_free';
  }
}

const getInvoicesKey = (userId: string, tier: string) => `recovr_db_invoices_${userId || 'guest'}_${tier}`;
const getCustomersKey = (userId: string, tier: string) => `recovr_db_customers_${userId || 'guest'}_${tier}`;
const getFocusKey = (userId: string, tier: string) => `recovr_db_focus_${userId || 'guest'}_${tier}`;
const getPaymentsKey = (userId: string, tier: string) => `recovr_db_payments_${userId || 'guest'}_${tier}`;

// --------------------------------------------------------------------------
// Row <-> Model Adapters for recovery_outreach_* tables
// --------------------------------------------------------------------------

export function recoveryRowToInvoice(row: any): Invoice {
  const amount = Number(row.overdue_amount || row.debit || row.running_balance || 0);
  const invoiceNumber = row.bill_no || row.voucher_no || `INV-${row.id}`;
  const partyName = row.party_name || row.customer_name || 'Valued Debtor';
  const customerEmail = row.email || row.customer_email || '';
  const customerPhone = row.phone || '';

  // 1. Calculate Days Overdue & Due Date
  let daysOverdue = 0;
  let dueDate = '';

  if (row.transaction_date) {
    const txDate = new Date(row.transaction_date);
    if (!isNaN(txDate.getTime())) {
      dueDate = txDate.toISOString().split('T')[0];
      const diffTime = Date.now() - txDate.getTime();
      daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }
  } else if (row.oldest_due_date) {
    const dDate = new Date(row.oldest_due_date);
    if (!isNaN(dDate.getTime())) {
      dueDate = dDate.toISOString().split('T')[0];
      const diffTime = Date.now() - dDate.getTime();
      daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }
  }

  if (row.max_overdue_days && !isNaN(Number(row.max_overdue_days))) {
    daysOverdue = Math.max(daysOverdue, Number(row.max_overdue_days));
  }

  // 2. Derive Ageing Bucket
  let bucket: 'early' | '15+' | '30+' | '60+' = 'early';
  let bucketTone = 'Gentle Courtesy';
  if (daysOverdue >= 60) {
    bucket = '60+';
    bucketTone = 'Legal / Exec Action';
  } else if (daysOverdue >= 30) {
    bucket = '30+';
    bucketTone = 'Formal Recovery';
  } else if (daysOverdue >= 15) {
    bucket = '15+';
    bucketTone = 'Firm Demand';
  } else {
    bucket = 'early';
    bucketTone = 'Gentle Courtesy';
  }

  // 3. Status mapping
  let status: InvoiceStatus = 'active';
  const rawStatus = (row.status || '').toLowerCase().trim();
  const rawClosed = (row.closed || '').toLowerCase().trim();

  if (rawClosed === 'yes' || rawClosed === 'true' || rawStatus === 'paid' || rawStatus === 'closed') {
    status = 'paid';
  } else if (rawStatus === 'paused') {
    status = 'paused';
  } else if (rawStatus === 'dispute' || rawStatus === 'disputed' || row.dispute === 'yes' || row.dispute === 'true') {
    status = 'disputed';
  } else if (rawStatus === 'promise' || rawStatus === 'promised') {
    status = 'promise';
  }

  // 4. Calculate Risk Score (0-100) & Risk Tier
  let riskScore = 100;
  if (daysOverdue >= 60) riskScore -= 50;
  else if (daysOverdue >= 30) riskScore -= 35;
  else if (daysOverdue >= 15) riskScore -= 20;
  else if (daysOverdue > 0) riskScore -= 5;

  if (row.dispute === 'yes' || row.dispute === 'true' || status === 'disputed') {
    riskScore -= 25;
  }

  if (row.sentiment_score !== null && row.sentiment_score !== undefined) {
    const sScore = Number(row.sentiment_score);
    if (!isNaN(sScore)) {
      if (sScore < 0) riskScore -= 15;
      else if (sScore < 50 && sScore > 1) riskScore -= 10;
    }
  } else if (row.sentiment && (row.sentiment.toLowerCase() === 'negative' || row.sentiment.toLowerCase() === 'urgent' || row.sentiment.toLowerCase() === 'evasive')) {
    riskScore -= 15;
  }
  riskScore = Math.max(10, Math.min(99, riskScore));

  let riskTier: CustomerRiskTier = 'reliable';
  if (riskScore < 45) riskTier = 'high_risk';
  else if (riskScore < 70) riskTier = 'watch';

  // 5. Scan Touchpoints for Last Outreach (email_*, wa_*, voice_*)
  let latestSentAt: Date | null = null;
  let latestChannel: ChannelType = 'email';
  let latestActionName = '';

  for (let i = 1; i <= 10; i++) {
    // Check Voice
    const voiceSent = row[`voice_${i}_sent_at`] || row[`call_${i}_sent_at`];
    if (voiceSent) {
      const d = new Date(voiceSent);
      if (!isNaN(d.getTime()) && (!latestSentAt || d > latestSentAt)) {
        latestSentAt = d;
        latestChannel = 'voice';
        latestActionName = `AI Voice Call ${i} Attempted`;
      }
    }
    // Check WhatsApp
    const waSent = row[`wa_${i}_sent_at`];
    if (waSent) {
      const d = new Date(waSent);
      if (!isNaN(d.getTime()) && (!latestSentAt || d > latestSentAt)) {
        latestSentAt = d;
        latestChannel = 'whatsapp';
        latestActionName = `WhatsApp Notice ${i} Delivered`;
      }
    }
    // Check Email
    const emailSent = row[`email_${i}_sent_at`];
    if (emailSent) {
      const d = new Date(emailSent);
      if (!isNaN(d.getTime()) && (!latestSentAt || d > latestSentAt)) {
        latestSentAt = d;
        latestChannel = 'email';
        latestActionName = `Email Reminder ${i} Sent`;
      }
    }
  }

  let lastTouch = {
    channel: latestChannel,
    action: latestActionName || (row.next_action ? `Next: ${row.next_action}` : 'Cycle Initialized'),
    timestamp: latestSentAt ? latestSentAt.toISOString() : (row.cycle_started_date || row.created_at || 'Recently'),
  };

  // 6. Current Stage
  let currentStage: Invoice['currentStage'] = 'Friendly';
  const rawStage = (row.current_stage || '').toLowerCase();
  if (rawStage.includes('legal') || rawStage.includes('executive')) {
    currentStage = 'Executive/Legal Hold';
  } else if (rawStage.includes('escalat')) {
    currentStage = 'Escalation';
  } else if (rawStage.includes('firm')) {
    currentStage = 'Firm';
  } else if (status === 'paid') {
    currentStage = 'Done';
  }

  // 7. Timeline events
  const timeline: TimelineEvent[] = [];
  if (row.transaction_date) {
    timeline.push({
      id: `evt-tx-${row.id}`,
      timestamp: row.transaction_date,
      type: 'invoice_due',
      title: 'Invoice Issued',
      description: `Bill #${invoiceNumber} for ₹${amount.toLocaleString('en-IN')} issued to ${partyName}`,
    });
  }
  if (latestSentAt) {
    timeline.push({
      id: `evt-touch-${row.id}`,
      timestamp: latestSentAt.toISOString(),
      channel: latestChannel,
      type: latestChannel === 'whatsapp' ? 'whatsapp_sent' : latestChannel === 'voice' ? 'voice_call' : 'email_sent',
      title: latestActionName,
      description: row.summary || `Touchpoint dispatched via ${latestChannel.toUpperCase()}`,
    });
  }
  if (row.Payment_Date || row.Final_Amount) {
    timeline.push({
      id: `evt-pay-${row.id}`,
      timestamp: row.Payment_Date || new Date().toISOString(),
      type: 'payment_verified',
      title: 'Payment Recorded',
      description: `Received Final Amount ₹${Number(row.Final_Amount || amount).toLocaleString('en-IN')}`,
    });
  }

  return {
    id: String(row.id),
    invoiceNumber,
    customerId: `cust-${row.id}`,
    customerName: partyName,
    customerEmail,
    customerPhone,
    customerCompany: partyName,
    amount,
    currency: '₹',
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    daysOverdue,
    bucket,
    bucketTone,
    status,
    riskScore,
    riskTier,
    cadence: 'standard',
    currentStage,
    lastTouch,
    nextScheduledStep: row.next_action || (daysOverdue > 21 ? 'Manual Review' : 'Day 1 Friendly Email'),
    hasProofFile: false,
    hasTicket: false,
    hasDispute: Boolean(row.dispute === 'yes' || row.dispute === 'true'),
    disputeReason: row.dispute_reason || (row.dispute === 'yes' ? 'Dispute flagged during recovery' : undefined),
    promisedDate: row.Payment_Date,
    timeline,
  };
}

export function invoiceToRecoveryRow(inv: Invoice, extraProps: Record<string, any> = {}): Record<string, any> {
  return {
    party_name: inv.customerCompany || inv.customerName,
    customer_name: inv.customerName,
    customer_email: inv.customerEmail,
    email: inv.customerEmail,
    phone: inv.customerPhone,
    bill_no: inv.invoiceNumber,
    voucher_no: extraProps.voucher_no || `VCH-${inv.invoiceNumber}`,
    overdue_amount: String(inv.amount),
    running_balance: String(inv.amount),
    current_stage: inv.currentStage,
    next_action: inv.nextScheduledStep || 'Day 1 Friendly Email',
    next_action_date: inv.dueDate,
    status: inv.status === 'paid' ? 'Paid' : inv.status === 'paused' ? 'Paused' : 'Active',
    closed: inv.status === 'paid' ? 'yes' : 'no',
    transaction_date: inv.dueDate,
    updated_at: new Date().toISOString(),
    Final_Amount: inv.status === 'paid' ? String(inv.amount) : null,
    Payment_Date: inv.status === 'paid' ? new Date().toISOString() : null,
    ...extraProps,
  };
}

export function recoveryRowsToCustomers(invoices: Invoice[]): Record<string, CustomerProfile> {
  const map: Record<string, CustomerProfile> = {};

  for (const inv of invoices) {
    const custId = inv.customerId;
    if (!map[custId]) {
      map[custId] = {
        id: custId,
        name: inv.customerName,
        company: inv.customerCompany,
        email: inv.customerEmail,
        phone: inv.customerPhone,
        bucket: inv.bucket,
        riskScore: inv.riskScore,
        riskTier: inv.riskTier,
        cadence: inv.cadence,
        isLockedByOwner: false,
        lastUpdatedAfterPayment: 'Recently',
        whyExplanation: `${inv.customerCompany} has ₹${inv.amount.toLocaleString('en-IN')} in active recovery.`,
        historyFactors: {
          latePaymentsCount: inv.daysOverdue > 0 ? 1 : 0,
          avgDaysLate: inv.daysOverdue,
          promisesKept: 0,
          promisesBroken: 0,
          disputesCount: inv.hasDispute ? 1 : 0,
          partPaymentHabits: 'rare',
        },
        scoreBreakdown: [
          {
            factor: 'Overdue Ageing',
            impact: inv.daysOverdue > 30 ? 'High' : 'Medium',
            points: inv.daysOverdue > 30 ? -35 : -10,
            isPositive: false,
            explanation: `${inv.daysOverdue} days since issue`,
          },
        ],
        totalOutstanding: inv.amount,
        totalPaidLifetime: inv.status === 'paid' ? inv.amount : 0,
        avgPaymentDays: inv.daysOverdue,
        primaryContact: inv.customerName,
        recentConversations: [
          {
            channel: inv.lastTouch.channel,
            date: inv.lastTouch.timestamp,
            snippet: inv.lastTouch.action,
            sentiment: 'neutral',
          },
        ],
      };
    } else {
      map[custId].totalOutstanding += inv.amount;
      if (inv.status === 'paid') {
        map[custId].totalPaidLifetime += inv.amount;
      }
    }
  }

  return map;
}

export function recoveryRowsToFocusItems(invoices: Invoice[], rawRows: any[] = []): FocusItem[] {
  const items: FocusItem[] = [];

  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    const raw = rawRows[i] || {};

    // 1. Founder Review / Approvals
    if (raw.founder_review === 'true' || raw.founder_review === 'yes') {
      items.push({
        id: `focus-fr-${inv.id}`,
        type: 'approval',
        title: `Approve Next Escalation: ${inv.customerCompany}`,
        customerName: inv.customerName,
        company: inv.customerCompany,
        invoiceId: inv.invoiceNumber,
        amount: inv.amount,
        badgeText: 'Approval Required',
        badgeVariant: 'amber',
        description: raw.next_action || `Step requires founder sign-off before sending to ${inv.customerName}`,
        actionPrimary: {
          label: 'Approve & Send',
          actionKey: 'approve_step',
        },
        actionSecondary: {
          label: 'Pause Outreach',
          actionKey: 'pause_invoice',
        },
      });
    }

    // 2. Active Disputes
    if (inv.hasDispute) {
      items.push({
        id: `focus-disp-${inv.id}`,
        type: 'dispute',
        title: `Debtor Dispute: ${inv.customerCompany}`,
        customerName: inv.customerName,
        company: inv.customerCompany,
        invoiceId: inv.invoiceNumber,
        amount: inv.amount,
        badgeText: 'Dispute Flagged',
        badgeVariant: 'rose',
        description: inv.disputeReason || 'Debtor has flagged an objection on this invoice.',
        actionPrimary: {
          label: 'Review Objection',
          actionKey: 'resolve_dispute',
        },
      });
    }

    // 3. Invoices >= 22 Days (Escalation / Day 22 Focus)
    if (inv.status === 'active' && inv.daysOverdue >= 22) {
      items.push({
        id: `focus-d22-${inv.id}`,
        type: 'approval',
        title: `21-Day Engine Complete: ${inv.customerCompany}`,
        customerName: inv.customerName,
        company: inv.customerCompany,
        invoiceId: inv.invoiceNumber,
        amount: inv.amount,
        badgeText: 'Legal Hold Review',
        badgeVariant: 'rose',
        description: `Full autonomous sequence finished (${inv.daysOverdue} days overdue). Ready for formal recovery.`,
        actionPrimary: {
          label: 'Initiate Legal Notice',
          actionKey: 'legal_notice',
        },
        actionSecondary: {
          label: 'Grant 7-Day Extension',
          actionKey: 'extend_grace',
        },
      });
    }
  }

  return items;
}

export function recoveryRowsToPayments(rawRows: any[]): PaymentRecord[] {
  const payments: PaymentRecord[] = [];

  for (const r of rawRows) {
    if (r.Payment_Date || r.Final_Amount || r.status?.toLowerCase() === 'paid' || r.closed?.toLowerCase() === 'yes') {
      payments.push({
        id: `pay-${r.id}`,
        invoiceId: `inv-${r.id}`,
        invoiceNumber: r.bill_no || r.voucher_no || `INV-${r.id}`,
        customerName: r.party_name || r.customer_name || 'Customer',
        customerCompany: r.party_name || r.customer_name || 'Customer',
        amount: Number(r.Final_Amount || r.overdue_amount || 0),
        paymentMethod: 'Bank Settlement',
        bankReference: r.voucher_no || `REF-${r.id}`,
        status: 'verified',
        settledAt: r.Payment_Date || r.updated_at || new Date().toISOString(),
      });
    }
  }

  return payments;
}

// --------------------------------------------------------------------------
// Unified Database Operations
// --------------------------------------------------------------------------

export interface DashboardDataResult {
  invoices: Invoice[];
  customers: Record<string, CustomerProfile>;
  focusItems: FocusItem[];
  payments: PaymentRecord[];
  isCloud: boolean;
}

/**
 * Loads dashboard data for the given user from their tier-specific Supabase table:
 * - Free: recovery_outreach_free
 * - Basic: recovery_outreach_basic
 * - Growth: recovery_outreach_growth
 * - Enterprise: recovery_outreach_enterprise
 */
export async function loadDashboardData(
  userId: string,
  planTier: PlanTier = 'free'
): Promise<DashboardDataResult> {
  const safeUserId = userId || 'local_user';
  const targetTable = getRecoveryTableName(planTier);

  // 1. Try Supabase Cloud Database using target tier table
  if (isSupabaseConfigured && supabase) {
    try {
      console.log(`[DashboardDb] Fetching data from Supabase table: ${targetTable} for tier: ${planTier}`);
      const { data: rows, error } = await supabase
        .from(targetTable)
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.warn(`[DashboardDb] Query on ${targetTable} notice:`, error);
      } else if (rows) {
        // Map rows directly to frontend models
        const invoices = rows.map(recoveryRowToInvoice);
        const customers = recoveryRowsToCustomers(invoices);
        const focusItems = recoveryRowsToFocusItems(invoices, rows);
        const payments = recoveryRowsToPayments(rows);

        // Cache locally for offline speed
        localStorage.setItem(getInvoicesKey(safeUserId, planTier), JSON.stringify(invoices));
        localStorage.setItem(getCustomersKey(safeUserId, planTier), JSON.stringify(customers));
        localStorage.setItem(getFocusKey(safeUserId, planTier), JSON.stringify(focusItems));
        localStorage.setItem(getPaymentsKey(safeUserId, planTier), JSON.stringify(payments));

        return {
          invoices,
          customers,
          focusItems,
          payments,
          isCloud: true,
        };
      }
    } catch (cloudErr) {
      console.warn(`[DashboardDb] Cloud fetch failed on ${targetTable}, checking local cache:`, cloudErr);
    }
  }

  // 2. Local Storage Fallback
  try {
    const rawInvoices = localStorage.getItem(getInvoicesKey(safeUserId, planTier));
    const rawCustomers = localStorage.getItem(getCustomersKey(safeUserId, planTier));
    const rawFocus = localStorage.getItem(getFocusKey(safeUserId, planTier));
    const rawPayments = localStorage.getItem(getPaymentsKey(safeUserId, planTier));

    if (rawInvoices && rawCustomers) {
      return {
        invoices: JSON.parse(rawInvoices),
        customers: JSON.parse(rawCustomers),
        focusItems: rawFocus ? JSON.parse(rawFocus) : [],
        payments: rawPayments ? JSON.parse(rawPayments) : [],
        isCloud: false,
      };
    }
  } catch (err) {
    console.warn('Local storage parse error:', err);
  }

  // 3. Return clean empty set (no fake mock data so user sees their actual clean database!)
  return {
    invoices: [],
    customers: {},
    focusItems: [],
    payments: [],
    isCloud: true,
  };
}

/**
 * Adds a new invoice to the active tier's Supabase table
 */
export async function addInvoiceToDb(
  userId: string,
  invoice: Invoice,
  planTier: PlanTier = 'free'
): Promise<void> {
  const safeUserId = userId || 'local_user';
  const targetTable = getRecoveryTableName(planTier);

  // 1. Update local cache
  try {
    const raw = localStorage.getItem(getInvoicesKey(safeUserId, planTier)) || '[]';
    const invoices: Invoice[] = JSON.parse(raw);
    invoices.unshift(invoice);
    localStorage.setItem(getInvoicesKey(safeUserId, planTier), JSON.stringify(invoices));
  } catch (e) {
    console.warn('Local add invoice warning:', e);
  }

  // 2. Insert into Supabase targetTable
  if (isSupabaseConfigured && supabase) {
    try {
      const row = invoiceToRecoveryRow(invoice, {
        customer_uid: userId !== 'local_user' ? userId : null,
      });
      const { data, error } = await supabase.from(targetTable).insert([row]).select().single();
      if (error) {
        console.error(`Failed to insert into ${targetTable}:`, error);
      } else if (data) {
        console.log(`Successfully added invoice ${data.bill_no} (id: ${data.id}) to ${targetTable}`);
      }
    } catch (err) {
      console.error(`Error saving invoice to ${targetTable}:`, err);
    }
  }
}

/**
 * Saves or updates an invoice in the active tier's Supabase table
 */
export async function saveInvoiceInDb(
  userId: string,
  invoice: Invoice,
  planTier: PlanTier = 'free'
): Promise<void> {
  const safeUserId = userId || 'local_user';
  const targetTable = getRecoveryTableName(planTier);

  // 1. Update Local Cache
  try {
    const raw = localStorage.getItem(getInvoicesKey(safeUserId, planTier)) || '[]';
    const invoices: Invoice[] = JSON.parse(raw);
    const idx = invoices.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) invoices[idx] = invoice;
    else invoices.unshift(invoice);
    localStorage.setItem(getInvoicesKey(safeUserId, planTier), JSON.stringify(invoices));
  } catch (err) {
    console.warn('Local save invoice error:', err);
  }

  // 2. Update in Supabase targetTable
  if (isSupabaseConfigured && supabase) {
    try {
      const updateData = {
        status: invoice.status === 'paid' ? 'Paid' : invoice.status === 'paused' ? 'Paused' : 'Active',
        current_stage: invoice.currentStage,
        next_action: invoice.nextScheduledStep,
        overdue_amount: String(invoice.amount),
        updated_at: new Date().toISOString(),
      };

      if (!isNaN(Number(invoice.id))) {
        await supabase.from(targetTable).update(updateData).eq('id', Number(invoice.id));
      } else {
        await supabase.from(targetTable).update(updateData).eq('bill_no', invoice.invoiceNumber);
      }
    } catch (err) {
      console.warn(`Supabase update error on ${targetTable}:`, err);
    }
  }
}

/**
 * Records a settled payment in the active tier's Supabase table
 */
export async function recordPaymentInDb(
  userId: string,
  payment: PaymentRecord,
  updatedInvoice: Invoice,
  updatedCustomer?: CustomerProfile,
  planTier: PlanTier = 'free'
): Promise<void> {
  const safeUserId = userId || 'local_user';
  const targetTable = getRecoveryTableName(planTier);

  // 1. Update Local Cache
  try {
    const existingPaymentsRaw = localStorage.getItem(getPaymentsKey(safeUserId, planTier)) || '[]';
    const payments: PaymentRecord[] = JSON.parse(existingPaymentsRaw);
    payments.unshift(payment);
    localStorage.setItem(getPaymentsKey(safeUserId, planTier), JSON.stringify(payments));

    const existingInvoicesRaw = localStorage.getItem(getInvoicesKey(safeUserId, planTier)) || '[]';
    const invoices: Invoice[] = JSON.parse(existingInvoicesRaw);
    const updatedInvoices = invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv));
    localStorage.setItem(getInvoicesKey(safeUserId, planTier), JSON.stringify(updatedInvoices));

    if (updatedCustomer) {
      const existingCustomersRaw = localStorage.getItem(getCustomersKey(safeUserId, planTier)) || '{}';
      const customers: Record<string, CustomerProfile> = JSON.parse(existingCustomersRaw);
      customers[updatedCustomer.id] = updatedCustomer;
      localStorage.setItem(getCustomersKey(safeUserId, planTier), JSON.stringify(customers));
    }
  } catch (err) {
    console.warn('Local payment cache update error:', err);
  }

  // 2. Update in Supabase targetTable
  if (isSupabaseConfigured && supabase) {
    try {
      const updateData = {
        status: 'Paid',
        closed: 'yes',
        Final_Amount: String(payment.amount),
        Payment_Date: payment.settledAt || new Date().toISOString(),
        current_stage: 'Done',
        updated_at: new Date().toISOString(),
      };

      if (!isNaN(Number(updatedInvoice.id))) {
        await supabase.from(targetTable).update(updateData).eq('id', Number(updatedInvoice.id));
      } else {
        await supabase.from(targetTable).update(updateData).eq('bill_no', updatedInvoice.invoiceNumber);
      }
    } catch (cloudErr) {
      console.warn(`Supabase payment sync note on ${targetTable}:`, cloudErr);
    }
  }
}

/**
 * Saves customer profile changes
 */
export async function saveCustomerInDb(
  userId: string,
  customer: CustomerProfile,
  planTier: PlanTier = 'free'
): Promise<void> {
  const safeUserId = userId || 'local_user';
  try {
    const raw = localStorage.getItem(getCustomersKey(safeUserId, planTier)) || '{}';
    const customers: Record<string, CustomerProfile> = JSON.parse(raw);
    customers[customer.id] = customer;
    localStorage.setItem(getCustomersKey(safeUserId, planTier), JSON.stringify(customers));
  } catch (err) {
    console.warn('Local save customer error:', err);
  }
}

/**
 * Syncs Focus Items list
 */
export async function syncFocusItemsInDb(
  userId: string,
  items: FocusItem[],
  planTier: PlanTier = 'free'
): Promise<void> {
  const safeUserId = userId || 'local_user';
  try {
    localStorage.setItem(getFocusKey(safeUserId, planTier), JSON.stringify(items));
  } catch (err) {
    console.warn('Local sync focus items error:', err);
  }
}
