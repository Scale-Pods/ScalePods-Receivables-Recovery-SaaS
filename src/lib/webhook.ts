/**
 * Webhook Dispatcher for Plan Purchases and Upgrades
 * Sends lead & plan purchase activity to the designated n8n automation webhook.
 */

export interface PlanWebhookPayload {
  name: string;
  email: string;
  companyName?: string;
  plan: string;
  planId?: string;
  billingCycle?: 'monthly' | 'annual';
  amount?: number | string;
  status?: string;
  timestamp?: string;
}

export interface InvoiceExtractionWebhookPayload {
  // Extracted Invoice Details (nullable as extracted)
  invoiceNumber: string | null;
  customerCompany: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  amount: number | null;
  dueDate: string | null;
  daysOverdue?: number;
  bucket?: string;
  recommendedSequence?: string;
  confidenceScore?: number;
  fileName?: string | null;
  fileSize?: string | null;

  // Active User Account Context
  userEmail: string;
  userTier: string;
  userName?: string;
  userCompany?: string;

  timestamp?: string;
}

const DEFAULT_WEBHOOK_URL = 'https://n8n.srv1711190.hstgr.cloud/webhook/a9ba9cc7-ece8-4fb8-b9a5-be6089e426fe';
const DEFAULT_INVOICE_EXTRACTION_WEBHOOK_URL = 'https://n8n.srv1711190.hstgr.cloud/webhook/35525ae3-330b-4347-a870-2b5da1de70f8';

/**
 * Sends customer details (Name, Email, Company, Selected Plan) to n8n webhook
 */
export async function sendPlanPurchaseWebhook(data: PlanWebhookPayload): Promise<void> {
  const webhookUrl =
    import.meta.env.VITE_N8N_PURCHASE_WEBHOOK_URL ||
    DEFAULT_WEBHOOK_URL;

  const payload = {
    name: data.name || 'Anonymous User',
    email: data.email || '',
    companyName: data.companyName || '',
    plan: data.plan,
    planId: data.planId || data.plan.toLowerCase(),
    billingCycle: data.billingCycle || 'monthly',
    amount: data.amount ?? '',
    status: data.status || 'plan_selected',
    timestamp: data.timestamp || new Date().toISOString(),
  };

  try {
    // Attempt standard POST with JSON
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Fallback using text/plain (avoids CORS preflight rejection if webhook CORS headers are strict)
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });
    } catch (fallbackErr) {
      console.warn('Webhook notification delivery notice:', fallbackErr);
    }
  }
}

/**
 * Sends extracted invoice details along with logged-in user email and tier to n8n webhook
 */
export async function sendInvoiceExtractionWebhook(data: InvoiceExtractionWebhookPayload): Promise<void> {
  const webhookUrl =
    import.meta.env.VITE_N8N_INVOICE_WEBHOOK_URL ||
    DEFAULT_INVOICE_EXTRACTION_WEBHOOK_URL;

  const payload = {
    // User Context
    userEmail: data.userEmail || '',
    userTier: data.userTier || 'free',
    userName: data.userName || '',
    userCompany: data.userCompany || '',

    // Extracted Invoice Details
    invoiceNumber: data.invoiceNumber,
    customerCompany: data.customerCompany,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    customerPhone: data.customerPhone,
    amount: data.amount,
    currency: '₹',
    dueDate: data.dueDate,
    daysOverdue: data.daysOverdue ?? 0,
    bucket: data.bucket || 'early',
    recommendedSequence: data.recommendedSequence || 'standard',
    confidenceScore: data.confidenceScore ?? 0,
    fileName: data.fileName || null,
    fileSize: data.fileSize || null,

    status: 'invoice_extracted',
    timestamp: data.timestamp || new Date().toISOString(),
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
      });
    } catch (fallbackErr) {
      console.warn('Invoice extraction webhook delivery notice:', fallbackErr);
    }
  }
}
