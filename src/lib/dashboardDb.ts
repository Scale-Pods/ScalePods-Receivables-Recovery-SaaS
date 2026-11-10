import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Invoice, 
  CustomerProfile, 
  FocusItem, 
  PaymentRecord 
} from '../dashboard/types/dashboard';
import { 
  mockInvoices, 
  mockCustomers, 
  mockFocusItems 
} from '../dashboard/data/mockData';

// Initial settled payment for mock seed
const initialMockPayments: PaymentRecord[] = [
  {
    id: 'pay-seed-1',
    invoiceId: 'inv-9',
    invoiceNumber: 'INV-2024-830',
    customerName: 'Deepa Nair',
    customerCompany: 'Lumina Digital Media Pvt Ltd',
    amount: 198000,
    paymentMethod: 'ICICI IMPS',
    bankReference: 'ICICI-IMPS-882049190',
    proofUrl: 'ICICI_IMPS_Receipt_Lumina_INV830.pdf',
    status: 'verified',
    settledAt: '2026-11-01T10:14:00Z',
  }
];

const getInvoicesKey = (userId: string) => `recovr_db_invoices_${userId || 'guest'}`;
const getCustomersKey = (userId: string) => `recovr_db_customers_${userId || 'guest'}`;
const getFocusKey = (userId: string) => `recovr_db_focus_${userId || 'guest'}`;
const getPaymentsKey = (userId: string) => `recovr_db_payments_${userId || 'guest'}`;

// --------------------------------------------------------------------------
// Mappers between DB Rows & Frontend TypeScript Interfaces
// --------------------------------------------------------------------------

function rowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email || '',
    customerPhone: row.customer_phone || '',
    customerCompany: row.customer_company,
    amount: Number(row.amount),
    currency: row.currency || '₹',
    dueDate: row.due_date || '',
    daysOverdue: Number(row.days_overdue || 0),
    bucket: row.bucket,
    bucketTone: row.bucket_tone || '',
    status: row.status,
    riskScore: Number(row.risk_score || 50),
    riskTier: row.risk_tier || 'watch',
    cadence: row.cadence || 'standard',
    currentStage: row.current_stage || 'Friendly',
    lastTouch: row.last_touch || { channel: 'email', action: 'Created', timestamp: 'Recently' },
    nextScheduledStep: row.next_scheduled_step,
    hasProofFile: Boolean(row.has_proof_file),
    proofFile: row.proof_file,
    hasTicket: Boolean(row.has_ticket),
    ticketQuery: row.ticket_query,
    hasDispute: Boolean(row.has_dispute),
    disputeReason: row.dispute_reason,
    promisedDate: row.promised_date,
    settlementOffer: row.settlement_offer,
    timeline: row.timeline || [],
  };
}

function invoiceToRow(inv: Invoice, userId: string) {
  return {
    id: inv.id,
    user_id: userId,
    invoice_number: inv.invoiceNumber,
    customer_id: inv.customerId,
    customer_name: inv.customerName,
    customer_company: inv.customerCompany,
    customer_email: inv.customerEmail || '',
    customer_phone: inv.customerPhone || '',
    amount: inv.amount,
    currency: inv.currency || '₹',
    due_date: inv.dueDate,
    days_overdue: inv.daysOverdue,
    bucket: inv.bucket,
    bucket_tone: inv.bucketTone,
    status: inv.status,
    risk_score: inv.riskScore,
    risk_tier: inv.riskTier,
    cadence: inv.cadence,
    current_stage: inv.currentStage,
    last_touch: inv.lastTouch,
    next_scheduled_step: inv.nextScheduledStep,
    has_proof_file: inv.hasProofFile,
    proof_file: inv.proofFile,
    has_ticket: inv.hasTicket,
    ticket_query: inv.ticketQuery,
    has_dispute: inv.hasDispute,
    dispute_reason: inv.disputeReason,
    promised_date: inv.promisedDate,
    settlement_offer: inv.settlementOffer,
    timeline: inv.timeline,
    updated_at: new Date().toISOString(),
  };
}

function rowToPayment(row: any): PaymentRecord {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    invoiceNumber: row.invoice_number,
    customerName: row.customer_name,
    customerCompany: row.customer_company,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    bankReference: row.bank_reference || '',
    proofUrl: row.proof_url,
    status: row.status || 'verified',
    settledAt: row.settled_at || row.created_at,
  };
}

function paymentToRow(pay: PaymentRecord, userId: string) {
  return {
    id: pay.id,
    user_id: userId,
    invoice_id: pay.invoiceId,
    invoice_number: pay.invoiceNumber,
    customer_name: pay.customerName,
    customer_company: pay.customerCompany,
    amount: pay.amount,
    payment_method: pay.paymentMethod,
    bank_reference: pay.bankReference,
    proof_url: pay.proofUrl || null,
    status: pay.status,
    settled_at: pay.settledAt,
  };
}

function rowToCustomer(row: any): CustomerProfile {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email || '',
    phone: row.phone || '',
    bucket: row.bucket || 'early',
    riskScore: Number(row.risk_score || 50),
    riskTier: row.risk_tier || 'watch',
    cadence: row.cadence || 'standard',
    isLockedByOwner: Boolean(row.is_locked_by_owner),
    lockedReason: row.locked_reason,
    lastUpdatedAfterPayment: row.last_updated_after_payment || '',
    whyExplanation: row.why_explanation || '',
    historyFactors: row.history_factors || {
      latePaymentsCount: 0,
      avgDaysLate: 0,
      promisesKept: 0,
      promisesBroken: 0,
      disputesCount: 0,
      partPaymentHabits: 'none',
    },
    scoreBreakdown: row.score_breakdown || [],
    totalOutstanding: Number(row.total_outstanding || 0),
    totalPaidLifetime: Number(row.total_paid_lifetime || 0),
    avgPaymentDays: Number(row.avg_payment_days || 0),
    primaryContact: row.primary_contact || '',
    recentConversations: row.recent_conversations || [],
  };
}

function customerToRow(cust: CustomerProfile, userId: string) {
  return {
    id: cust.id,
    user_id: userId,
    name: cust.name,
    company: cust.company,
    email: cust.email,
    phone: cust.phone,
    bucket: cust.bucket,
    risk_score: cust.riskScore,
    risk_tier: cust.riskTier,
    cadence: cust.cadence,
    is_locked_by_owner: cust.isLockedByOwner,
    locked_reason: cust.lockedReason || null,
    last_updated_after_payment: cust.lastUpdatedAfterPayment,
    why_explanation: cust.whyExplanation,
    history_factors: cust.historyFactors,
    score_breakdown: cust.scoreBreakdown,
    total_outstanding: cust.totalOutstanding,
    total_paid_lifetime: cust.totalPaidLifetime,
    avg_payment_days: cust.avgPaymentDays,
    primary_contact: cust.primaryContact,
    recent_conversations: cust.recentConversations,
    updated_at: new Date().toISOString(),
  };
}

function rowToFocusItem(row: any): FocusItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    customerName: row.customer_name,
    company: row.company,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    badgeText: row.badge_text,
    badgeVariant: row.badge_variant,
    description: row.description,
    actionPrimary: row.action_primary || { label: 'Action', actionKey: 'action' },
    actionSecondary: row.action_secondary,
    details: row.details,
  };
}

function focusItemToRow(item: FocusItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    type: item.type,
    title: item.title,
    customer_name: item.customerName,
    company: item.company,
    invoice_id: item.invoiceId,
    amount: item.amount,
    badge_text: item.badgeText,
    badge_variant: item.badgeVariant,
    description: item.description,
    action_primary: item.actionPrimary,
    action_secondary: item.actionSecondary,
    details: item.details,
    updated_at: new Date().toISOString(),
  };
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
 * Loads dashboard data for the given user:
 * - Attempts to read from Supabase Cloud PostgreSQL if connected.
 * - If user has no data in Supabase yet, seeds initial ledger and syncs to cloud.
 * - Falls back seamlessly to browser localStorage if offline / .env is unconfigured.
 */
export async function loadDashboardData(userId: string): Promise<DashboardDataResult> {
  const safeUserId = userId || 'local_user';

  // 1. Try Supabase Cloud Database
  if (isSupabaseConfigured && supabase && userId && userId !== 'local_user') {
    try {
      const [invRes, custRes, focRes, payRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('customers').select('*').eq('user_id', userId),
        supabase.from('focus_items').select('*').eq('user_id', userId),
        supabase.from('payments').select('*').eq('user_id', userId).order('settled_at', { ascending: false }),
      ]);

      // If user already has invoices in Supabase, return them
      if (invRes.data && invRes.data.length > 0) {
        const invoices = invRes.data.map(rowToInvoice);
        
        const customers: Record<string, CustomerProfile> = {};
        if (custRes.data) {
          custRes.data.forEach((r) => {
            const c = rowToCustomer(r);
            customers[c.id] = c;
          });
        }

        const focusItems = focRes.data ? focRes.data.map(rowToFocusItem) : [];
        const payments = payRes.data ? payRes.data.map(rowToPayment) : [];

        // Cache locally for offline speed
        localStorage.setItem(getInvoicesKey(safeUserId), JSON.stringify(invoices));
        localStorage.setItem(getCustomersKey(safeUserId), JSON.stringify(customers));
        localStorage.setItem(getFocusKey(safeUserId), JSON.stringify(focusItems));
        localStorage.setItem(getPaymentsKey(safeUserId), JSON.stringify(payments));

        return { invoices, customers, focusItems, payments, isCloud: true };
      }

      // If user is new in Supabase, seed their initial starting ledger into Supabase
      console.log('Seeding initial ledger in Supabase for user:', userId);
      const invoiceRows = mockInvoices.map((inv) => invoiceToRow(inv, userId));
      const customerRows = Object.values(mockCustomers).map((cust) => customerToRow(cust, userId));
      const focusRows = mockFocusItems.map((foc) => focusItemToRow(foc, userId));
      const paymentRows = initialMockPayments.map((p) => paymentToRow(p, userId));

      await Promise.all([
        supabase.from('invoices').upsert(invoiceRows),
        supabase.from('customers').upsert(customerRows),
        supabase.from('focus_items').upsert(focusRows),
        supabase.from('payments').upsert(paymentRows),
      ]);

      return {
        invoices: mockInvoices,
        customers: mockCustomers,
        focusItems: mockFocusItems,
        payments: initialMockPayments,
        isCloud: true,
      };
    } catch (err) {
      console.warn('Supabase dashboard query failed, falling back to local database:', err);
    }
  }

  // 2. Local Storage Database Engine (Fallback)
  try {
    const rawInvoices = localStorage.getItem(getInvoicesKey(safeUserId));
    const rawCustomers = localStorage.getItem(getCustomersKey(safeUserId));
    const rawFocus = localStorage.getItem(getFocusKey(safeUserId));
    const rawPayments = localStorage.getItem(getPaymentsKey(safeUserId));

    if (rawInvoices && rawCustomers) {
      return {
        invoices: JSON.parse(rawInvoices),
        customers: JSON.parse(rawCustomers),
        focusItems: rawFocus ? JSON.parse(rawFocus) : mockFocusItems,
        payments: rawPayments ? JSON.parse(rawPayments) : initialMockPayments,
        isCloud: false,
      };
    }

    // Seed local database initially
    localStorage.setItem(getInvoicesKey(safeUserId), JSON.stringify(mockInvoices));
    localStorage.setItem(getCustomersKey(safeUserId), JSON.stringify(mockCustomers));
    localStorage.setItem(getFocusKey(safeUserId), JSON.stringify(mockFocusItems));
    localStorage.setItem(getPaymentsKey(safeUserId), JSON.stringify(initialMockPayments));

    return {
      invoices: mockInvoices,
      customers: mockCustomers,
      focusItems: mockFocusItems,
      payments: initialMockPayments,
      isCloud: false,
    };
  } catch (localErr) {
    console.error('Local database read error:', localErr);
    return {
      invoices: mockInvoices,
      customers: mockCustomers,
      focusItems: mockFocusItems,
      payments: initialMockPayments,
      isCloud: false,
    };
  }
}

/**
 * Records a payment in the database:
 * 1. Inserts into payments table.
 * 2. Updates the invoice status to 'paid', currentStage to 'Done', and appends timeline.
 * 3. Updates customer lifetime stats and risk score in customers table.
 */
export async function recordPaymentInDb(
  userId: string,
  payment: PaymentRecord,
  updatedInvoice: Invoice,
  updatedCustomer?: CustomerProfile
): Promise<void> {
  const safeUserId = userId || 'local_user';

  // 1. Update Local Storage Database
  try {
    // Update Payments
    const existingPaymentsRaw = localStorage.getItem(getPaymentsKey(safeUserId)) || '[]';
    const payments: PaymentRecord[] = JSON.parse(existingPaymentsRaw);
    payments.unshift(payment);
    localStorage.setItem(getPaymentsKey(safeUserId), JSON.stringify(payments));

    // Update Invoices
    const existingInvoicesRaw = localStorage.getItem(getInvoicesKey(safeUserId)) || '[]';
    const invoices: Invoice[] = JSON.parse(existingInvoicesRaw);
    const updatedInvoices = invoices.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv));
    localStorage.setItem(getInvoicesKey(safeUserId), JSON.stringify(updatedInvoices));

    // Update Customers
    if (updatedCustomer) {
      const existingCustomersRaw = localStorage.getItem(getCustomersKey(safeUserId)) || '{}';
      const customers: Record<string, CustomerProfile> = JSON.parse(existingCustomersRaw);
      customers[updatedCustomer.id] = updatedCustomer;
      localStorage.setItem(getCustomersKey(safeUserId), JSON.stringify(customers));
    }
  } catch (err) {
    console.warn('Local database payment update error:', err);
  }

  // 2. Sync to Supabase Cloud Database if configured
  if (isSupabaseConfigured && supabase && userId && userId !== 'local_user') {
    try {
      await Promise.all([
        supabase.from('payments').insert(paymentToRow(payment, userId)),
        supabase.from('invoices').update({
          status: updatedInvoice.status,
          current_stage: updatedInvoice.currentStage,
          timeline: updatedInvoice.timeline,
          updated_at: new Date().toISOString(),
        }).eq('id', updatedInvoice.id).eq('user_id', userId),
        updatedCustomer
          ? supabase.from('customers').upsert(customerToRow(updatedCustomer, userId))
          : Promise.resolve(),
      ]);
    } catch (cloudErr) {
      console.warn('Supabase cloud payment sync note:', cloudErr);
    }
  }
}

/**
 * Saves or updates an invoice in the database
 */
export async function saveInvoiceInDb(userId: string, invoice: Invoice): Promise<void> {
  const safeUserId = userId || 'local_user';

  // 1. Update Local Storage
  try {
    const raw = localStorage.getItem(getInvoicesKey(safeUserId)) || '[]';
    const invoices: Invoice[] = JSON.parse(raw);
    const idx = invoices.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) {
      invoices[idx] = invoice;
    } else {
      invoices.unshift(invoice);
    }
    localStorage.setItem(getInvoicesKey(safeUserId), JSON.stringify(invoices));
  } catch (err) {
    console.warn('Local save invoice error:', err);
  }

  // 2. Sync to Supabase
  if (isSupabaseConfigured && supabase && userId && userId !== 'local_user') {
    try {
      await supabase.from('invoices').upsert(invoiceToRow(invoice, userId));
    } catch (err) {
      console.warn('Supabase upsert invoice error:', err);
    }
  }
}

/**
 * Adds a brand new invoice (e.g. from Smart Intake / OCR) to the database
 */
export async function addInvoiceToDb(userId: string, invoice: Invoice): Promise<void> {
  return saveInvoiceInDb(userId, invoice);
}

/**
 * Saves customer risk profile updates to the database
 */
export async function saveCustomerInDb(userId: string, customer: CustomerProfile): Promise<void> {
  const safeUserId = userId || 'local_user';

  // 1. Update Local Storage
  try {
    const raw = localStorage.getItem(getCustomersKey(safeUserId)) || '{}';
    const customers: Record<string, CustomerProfile> = JSON.parse(raw);
    customers[customer.id] = customer;
    localStorage.setItem(getCustomersKey(safeUserId), JSON.stringify(customers));
  } catch (err) {
    console.warn('Local save customer error:', err);
  }

  // 2. Sync to Supabase
  if (isSupabaseConfigured && supabase && userId && userId !== 'local_user') {
    try {
      await supabase.from('customers').upsert(customerToRow(customer, userId));
    } catch (err) {
      console.warn('Supabase upsert customer error:', err);
    }
  }
}

/**
 * Updates Focus Items list in the database (e.g. when an item is resolved or approved)
 */
export async function syncFocusItemsInDb(userId: string, items: FocusItem[]): Promise<void> {
  const safeUserId = userId || 'local_user';

  // 1. Update Local Storage
  try {
    localStorage.setItem(getFocusKey(safeUserId), JSON.stringify(items));
  } catch (err) {
    console.warn('Local sync focus items error:', err);
  }

  // 2. Sync to Supabase
  if (isSupabaseConfigured && supabase && userId && userId !== 'local_user') {
    try {
      // In Supabase, delete items not in current list or upsert existing
      const rows = items.map((i) => focusItemToRow(i, userId));
      if (rows.length > 0) {
        await supabase.from('focus_items').upsert(rows);
      }
    } catch (err) {
      console.warn('Supabase sync focus items error:', err);
    }
  }
}
