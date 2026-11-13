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

export interface CreateOrderRequest {
  name: string;
  email: string;
  companyName?: string;
  plan: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
}

export interface CreateOrderResponse {
  orderId: string | null;
  amountInPaise: number | null;
  currency: string;
  keyId?: string | null;
  rawResponse?: any;
}

export interface PaymentVerificationPayload {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  name: string;
  email: string;
  companyName?: string;
  plan: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
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
 * Creates a Razorpay Order via the server-side n8n webhook.
 * Parses and returns the generated order_id from Razorpay's API response.
 */
export async function createRazorpayOrderViaWebhook(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  const webhookUrl =
    import.meta.env.VITE_N8N_PURCHASE_WEBHOOK_URL ||
    DEFAULT_WEBHOOK_URL;

  const amountInPaise = Math.round(data.amount * 100);

  const payload = {
    action: 'create_razorpay_order',
    name: data.name || 'Anonymous User',
    email: data.email || '',
    companyName: data.companyName || '',
    plan: data.plan,
    planId: data.planId,
    billingCycle: data.billingCycle,
    amount: data.amount,
    amountInPaise,
    currency: 'INR',
    status: 'pay_via_razorpay_clicked',
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          // Handle arrays like [ { id: "order_TzHLTod6pfIkUp", amount: 100, currency: "INR" } ] or objects
          const orderObj = Array.isArray(json) ? json[0] : (json.data?.[0] || json.data || json);
          const orderId = orderObj?.id || orderObj?.order_id || orderObj?.orderId || null;
          const returnedAmount = orderObj?.amount !== undefined ? Number(orderObj.amount) : amountInPaise;
          const returnedCurrency = orderObj?.currency || 'INR';
          const returnedKeyId = orderObj?.key_id || orderObj?.keyId || orderObj?.key || null;

          if (orderId && typeof orderId === 'string' && orderId.startsWith('order_')) {
            return {
              orderId,
              amountInPaise: returnedAmount,
              currency: returnedCurrency,
              keyId: returnedKeyId,
              rawResponse: orderObj,
            };
          }
        } catch (parseErr) {
          console.warn('Order JSON parsing notice:', parseErr);
        }
      }
    }
  } catch (err) {
    console.warn('Webhook order creation error, falling back:', err);
  }

  return {
    orderId: null,
    amountInPaise,
    currency: 'INR',
  };
}

/**
 * Sends completed payment details (payment_id, order_id, signature) to backend/n8n for verification
 */
export async function sendPaymentVerificationWebhook(data: PaymentVerificationPayload): Promise<void> {
  const webhookUrl =
    import.meta.env.VITE_N8N_PURCHASE_WEBHOOK_URL ||
    DEFAULT_WEBHOOK_URL;

  const payload = {
    action: 'verify_payment',
    status: 'payment_successful',
    razorpay_payment_id: data.razorpay_payment_id,
    razorpay_order_id: data.razorpay_order_id || '',
    razorpay_signature: data.razorpay_signature || '',
    name: data.name,
    email: data.email,
    companyName: data.companyName || '',
    plan: data.plan,
    planId: data.planId,
    billingCycle: data.billingCycle,
    amount: data.amount,
    timestamp: new Date().toISOString(),
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
      console.warn('Payment verification delivery error:', fallbackErr);
    }
  }
}

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

export interface InvoiceUploadExtractionRequest {
  file?: File | null;
  fileBase64?: string | null;
  fileName: string;
  fileSize?: string | null;
  fileType?: string | null;
  fileSizeBytes?: number;
  debtorEmail: string;
  debtorPhone: string;
  userEmail: string;
  userTier: string;
  userName?: string;
  userCompany?: string;
}

export interface N8nExtractedInvoiceResponse {
  invoiceNumber: string | null;
  customerCompany: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  amount: number | null;
  dueDate: string | null;
  confidenceScore?: number;
  isN8nSuccess: boolean;
  rawResponse?: any;
}

/**
 * Sends uploaded invoice as multipart/form-data to n8n webhook
 * so the file binary is directly viewable in n8n's Binary tab and AI vision nodes.
 * Returns the parsed extraction result if n8n responds with extracted JSON.
 */
export async function uploadInvoiceToN8nForExtraction(
  data: InvoiceUploadExtractionRequest
): Promise<N8nExtractedInvoiceResponse> {
  const webhookUrl =
    import.meta.env.VITE_N8N_INVOICE_WEBHOOK_URL ||
    DEFAULT_INVOICE_EXTRACTION_WEBHOOK_URL;

  // Build multipart/form-data payload
  const formData = new FormData();

  // 1. Raw File binary (makes file directly viewable & downloadable in n8n UI)
  if (data.file) {
    formData.append('file', data.file, data.fileName || data.file.name);
  }

  // 2. Action trigger & status
  formData.append('action', 'extract_invoice_details');
  formData.append('status', 'upload_for_ai_extraction');
  formData.append('timestamp', new Date().toISOString());

  // 3. Debtor Contact Details (Required in intake form)
  formData.append('debtorEmail', data.debtorEmail);
  formData.append('debtorPhone', data.debtorPhone);
  formData.append('customerEmail', data.debtorEmail);
  formData.append('customerPhone', data.debtorPhone);

  // 4. File Metadata & Base64 string fallback
  formData.append('fileName', data.fileName);
  formData.append('fileType', data.fileType || data.file?.type || 'application/pdf');
  formData.append('fileSize', data.fileSize || '');
  if (data.fileSizeBytes) {
    formData.append('fileSizeBytes', data.fileSizeBytes.toString());
  }
  if (data.fileBase64) {
    formData.append('fileBase64', data.fileBase64);
  }

  // 5. Active Subscriber Context
  formData.append('userEmail', data.userEmail || '');
  formData.append('userTier', data.userTier || 'free');
  formData.append('userName', data.userName || '');
  formData.append('userCompany', data.userCompany || '');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          const extracted = Array.isArray(json) ? json[0] : (json.data || json.extracted || json.result || json);

          // Check if n8n returned any extracted fields
          const hasFields = Boolean(
            extracted && (
              extracted.invoiceNumber || extracted.invoice_number ||
              extracted.customerCompany || extracted.customer_company ||
              extracted.companyName || extracted.company_name ||
              extracted.amount !== undefined || extracted.total_amount !== undefined
            )
          );

          if (hasFields) {
            let parsedAmount: number | null = null;
            const rawAmt = extracted.amount ?? extracted.total_amount ?? extracted.totalAmount ?? extracted.grandTotal;
            if (rawAmt !== undefined && rawAmt !== null && rawAmt !== '') {
              const num = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.]/g, ''));
              if (!isNaN(num)) parsedAmount = num;
            }

            return {
              invoiceNumber: extracted.invoiceNumber || extracted.invoice_number || extracted.invNumber || extracted.invoiceNo || null,
              customerCompany: extracted.customerCompany || extracted.customer_company || extracted.companyName || extracted.company_name || null,
              customerName: extracted.customerName || extracted.customer_name || extracted.contactPerson || extracted.name || null,
              customerEmail: extracted.customerEmail || extracted.customer_email || extracted.email || data.debtorEmail || null,
              customerPhone: extracted.customerPhone || extracted.customer_phone || extracted.phone || data.debtorPhone || null,
              amount: parsedAmount,
              dueDate: extracted.dueDate || extracted.due_date || null,
              confidenceScore: extracted.confidenceScore || extracted.confidence || 96,
              isN8nSuccess: true,
              rawResponse: extracted,
            };
          }
        } catch (e) {
          console.warn('Could not parse JSON response from n8n webhook:', e);
        }
      }
    }
  } catch (err) {
    console.warn('n8n multipart upload fetch notice:', err);
  }

  return {
    invoiceNumber: null,
    customerCompany: null,
    customerName: null,
    customerEmail: data.debtorEmail,
    customerPhone: data.debtorPhone,
    amount: null,
    dueDate: null,
    isN8nSuccess: false,
  };
}
