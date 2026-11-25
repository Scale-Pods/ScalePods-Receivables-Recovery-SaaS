import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Check, 
  FileSpreadsheet, 
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Phone,
  AlertCircle,
  X,
  Files,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Invoice, PlanTier, CadenceIntensity } from '../types/dashboard';
import { UserAccount, STORAGE_KEY_USER } from '../../types/auth';
import {
  approveInvoiceDraft,
  extractInvoiceWithWorkflow,
  readStoredSequence,
  type ExtractedInvoiceDraft,
  type InvoiceApprovalResult,
  type InvoiceExtractionResult,
} from '../../lib/invoiceWorkflow';
import { QuotaUsage } from '../utils/quota';
import {
  buildRecoverySchedulePreview,
  defaultRecoverySequence,
  formatRecoveryStepBadge,
  type RecoveryChannel,
} from '../../lib/recoverySchedule';
import { InvoiceDocumentViewer } from './InvoiceDocumentViewer';
import AiLoader from '@/components/ui/ai-loader';
import '../intake.css';

interface InvoiceIntakeBlockProps {
  planTier: PlanTier;
  currentUser?: UserAccount | null;
  onAddInvoice: (newInvoice: Partial<Invoice>) => void;
  onInvoiceApproved?: (result: InvoiceApprovalResult) => void | Promise<void>;
  onUpgradePrompt: (tier: PlanTier) => void;
  quota?: QuotaUsage;
  onOpenTopUp?: () => void;
}

type AuditStage = 'uploading' | 'parsing' | 'parsed' | 'updating' | 'updated';
type BatchStatus = 'queued' | 'extracting' | 'ready' | 'error';

interface BatchItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: string;
  documentUrl: string | null;
  documentText: string | null;
  email: string;
  phone: string;
  status: BatchStatus;
  preview: ParsedInvoicePreview | null;
  error: string | null;
}

// Keep the extraction animation on screen long enough to be seen, even when
// the API responds (or fails) almost instantly.
const MIN_EXTRACTION_ANIMATION_MS = 2400;

interface AuditActivity {
  fileName: string;
  invoiceLabel: string;
  stage: AuditStage;
}

interface ParsedInvoicePreview {
  invoiceNumber: string | null;
  gstin: string | null;
  voucherNo: string | null;
  customerCompany: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  amount: number | null;
  currency: string;
  issueDate: string | null;
  dueDate: string | null;
  dueDateSource?: 'due_date' | 'payment_terms' | null;
  paymentTerms?: string | null;
  paymentTermsDays?: number | null;
  daysOverdue: number;
  bucket: 'early' | '15+' | '30+' | '60+';
  recommendedSequence: CadenceIntensity;
  isDuplicate: boolean;
  orderReference?: string | null;
  confidenceScore: number;
  isAiExtracted?: boolean;
  summary?: string | null;
  cycleStartedDate?: string | null;
  draftToken?: string;
  previewSequence?: unknown[];
  previewSource?: string;
}

export const InvoiceIntakeBlock: React.FC<InvoiceIntakeBlockProps> = ({
  planTier,
  currentUser,
  onAddInvoice,
  onInvoiceApproved,
  onUpgradePrompt,
  quota,
  onOpenTopUp,
}) => {
  const [activeTab, setActiveTab] = useState<'smart_upload' | 'manual_form' | 'connectors'>('smart_upload');

  // Active Logged-in User Session Context
  const resolvedUser = currentUser || (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  const effectiveUserEmail = resolvedUser?.email || '';
  const effectiveUserTier = resolvedUser?.planTier || planTier || 'free';
  const effectiveUserName = resolvedUser?.name || '';
  const effectiveUserCompany = resolvedUser?.companyName || '';

  const loggedInUid = currentUser?.customer_uid || currentUser?.uid || currentUser?.id;
  const storedCadence = useMemo(() => readStoredSequence(loggedInUid), [loggedInUid]);

  // Real File Upload States & Ref — one queue powers both single and bulk intake.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const auditHideTimerRef = useRef<number | null>(null);
  const extractionGateRef = useRef<{ promise: Promise<void>; finish: () => void } | null>(null);
  const approvingRef = useRef(false);
  const invoiceFieldRef = useRef<HTMLInputElement>(null);
  const gstinFieldRef = useRef<HTMLInputElement>(null);
  const emailFieldRef = useRef<HTMLInputElement>(null);
  const phoneFieldRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const activeItem = batch.find((item) => item.id === activeId) || null;
  const selectedFile = activeItem?.file ?? null;
  const uploadedFileName = activeItem?.fileName ?? null;
  const uploadedFileSize = activeItem?.fileSize ?? null;
  const documentUrl = activeItem?.documentUrl ?? null;
  const documentText = activeItem?.documentText ?? null;
  const scannedResult = activeItem?.preview ?? null;
  const batchBytes = batch.reduce((sum, item) => sum + item.file.size, 0);
  const batchSizeLabel = batchBytes >= 1024 * 1024
    ? `${(batchBytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(batchBytes / 1024))} KB`;

  // Edit handlers still use setScannedResult(...); route them to the active file.
  const setScannedResult = (
    value: ParsedInvoicePreview | null | ((prev: ParsedInvoicePreview) => ParsedInvoicePreview)
  ) => {
    setBatch((prev) =>
      prev.map((item) =>
        item.id === activeId && item.preview
          ? { ...item, preview: typeof value === 'function' ? value(item.preview) : value }
          : item
      )
    );
  };

  const batchRef = useRef<BatchItem[]>([]);
  batchRef.current = batch;

  useEffect(() => {
    return () => {
      batchRef.current.forEach((item) => {
        if (item.documentUrl) URL.revokeObjectURL(item.documentUrl);
      });
    };
  }, []);

  useEffect(() => {
    return () => {
      if (auditHideTimerRef.current) window.clearTimeout(auditHideTimerRef.current);
      extractionGateRef.current?.finish();
    };
  }, []);

  // OCR Parsing & Approval States
  const [isScanning, setIsScanning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [auditActivity, setAuditActivity] = useState<AuditActivity | null>(null);

  // Keeps the shared AI loader on screen long enough to be seen even when the
  // extraction endpoint answers (or fails) almost instantly.
  const startExtractionAnimation = () => {
    let finish!: () => void;
    const promise = new Promise<void>((resolve) => { finish = resolve; });
    const timer = window.setTimeout(finish, MIN_EXTRACTION_ANIMATION_MS);
    extractionGateRef.current = {
      promise,
      finish: () => {
        window.clearTimeout(timer);
        finish();
      },
    };
  };

  const stopExtractionAnimation = async () => {
    await extractionGateRef.current?.promise;
    extractionGateRef.current = null;
  };

  // Due-date calendar (UI only — still writes to scannedResult.dueDate)
  const dueDatePickerRef = useRef<HTMLDivElement>(null);
  const dueDateTriggerRef = useRef<HTMLButtonElement>(null);
  const dueDateCalendarRef = useRef<HTMLDivElement>(null);
  const [dueDatePickerOpen, setDueDatePickerOpen] = useState(false);
  const [dueDateMonth, setDueDateMonth] = useState(() => new Date());
  const [dueDatePos, setDueDatePos] = useState({ top: 0, left: 0 });
  const [schedulePanelOpen, setSchedulePanelOpen] = useState(true);

  const getCalendarMonth = (value: string | null) => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month] = value.split('-').map(Number);
      return new Date(year, month - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };

  const formatDueDate = (value: string | null) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Pick due date';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  };

  const toIsoDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCalendarCells = (monthDate: Date): Array<number | null> => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const leadingBlanks = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const calendarYear = dueDateMonth.getFullYear();
  const calendarMonthIndex = dueDateMonth.getMonth();
  const calendarCells = getCalendarCells(dueDateMonth);
  const todayIso = toIsoDate(new Date());

  const formatScheduleDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  };

  const previewSequence = scannedResult?.previewSequence?.length
    ? scannedResult.previewSequence
    : (storedCadence?.sequence || defaultRecoverySequence);
  const recoverySchedule = useMemo(() => {
    if (!scannedResult?.dueDate) return null;
    return buildRecoverySchedulePreview(
      previewSequence,
      scannedResult.dueDate,
      scannedResult.cycleStartedDate
    );
  }, [previewSequence, scannedResult?.dueDate, scannedResult?.cycleStartedDate]);

  const showSchedulePanel = Boolean(scannedResult?.dueDate) && !isScanning;

  const getChannelIcon = (channel: RecoveryChannel) => {
    if (channel === 'email') return Mail;
    if (channel === 'whatsapp') return MessageSquare;
    return Phone;
  };

  const getChannelLabel = (channel: RecoveryChannel) => {
    if (channel === 'email') return 'EMAIL';
    if (channel === 'whatsapp') return 'WA';
    return 'CALL';
  };

  const openDueDatePicker = () => {
    if (dueDatePickerOpen) {
      setDueDatePickerOpen(false);
      return;
    }
    setDueDateMonth(getCalendarMonth(scannedResult?.dueDate || null));
    const rect = dueDateTriggerRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 268;
      const height = 320;
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
      const below = rect.bottom + 8;
      const top = below + height > window.innerHeight ? Math.max(8, rect.top - height - 8) : below;
      setDueDatePos({ top, left });
    }
    setDueDatePickerOpen(true);
  };

  useEffect(() => {
    if (!dueDatePickerOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = dueDatePickerRef.current?.contains(target);
      const insideCalendar = dueDateCalendarRef.current?.contains(target);
      if (!insideTrigger && !insideCalendar) {
        setDueDatePickerOpen(false);
      }
    };
    const closePicker = () => setDueDatePickerOpen(false);
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', closePicker);
    window.addEventListener('scroll', closePicker, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', closePicker);
      window.removeEventListener('scroll', closePicker, true);
    };
  }, [dueDatePickerOpen]);

  // Real Non-Fabricating Invoice Reader & Field Extractor (All fields strictly extracted or nullable)
  const parseInvoiceFile = async (
    file: File | null,
    userEmail: string,
    userPhone: string
  ): Promise<ParsedInvoicePreview> => {
    if (!file) throw new Error("No file to parse");

    // Read raw buffer and extract decoded text strings (PDF text streams, CSV, text, XML)
    let rawText = '';
    try {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      rawText = decoder.decode(buffer);
    } catch {
      rawText = '';
    }

    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');

    // 1. Extract Invoice Number (Nullable - strictly from text or filename, never fabricated)
    let invoiceNumber: string | null = null;
    const invRegexes = [
      /(?:invoice\s*(?:no|num|number|#)?|inv\s*(?:no|num|number|#)?|bill\s*(?:no|num|number|#)?)\s*[:#\-]?\s*([A-Za-z0-9\-_/]{3,30})/i,
      /\b(INV[-_/][A-Z0-9\-_/]{3,20})\b/i,
      /\b(BILL[-_/][A-Z0-9\-_/]{3,20})\b/i,
      /\b(GST[-_/][A-Z0-9\-_/]{3,20})\b/i,
    ];
    for (const rx of invRegexes) {
      const m = rawText.match(rx);
      if (m && m[1] && m[1].trim().length >= 3) {
        const val = m[1].trim();
        if (!['number', 'no', 'date', 'bill', 'invoice'].includes(val.toLowerCase())) {
          invoiceNumber = val;
          break;
        }
      }
    }
    if (!invoiceNumber) {
      const fileInvMatch = cleanBaseName.match(/\b(INV[-_]?[0-9A-Z]{3,15})\b/i);
      if (fileInvMatch) {
        invoiceNumber = fileInvMatch[1].toUpperCase();
      }
    }

    // 2. Extract Company Name (Nullable - strictly from text or filename, never fabricated)
    let customerCompany: string | null = null;
    const companyRegexes = [
      /(?:bill\s*to|billed\s*to|customer\s*name|customer|client\s*name|client|buyer\s*name|buyer|m\/s|recipient)\s*[:\-]?\s*([A-Za-z0-9\s.,&'\-]{3,45})/i,
      /\b([A-Z][A-Za-z0-9\s&]{2,35}\s+(?:Pvt\s*Ltd|Private\s*Limited|Limited|LLP|Inc|Corp|Technologies|Solutions|Enterprise|Industries|Services))\b/i,
    ];
    for (const rx of companyRegexes) {
      const m = rawText.match(rx);
      if (m && m[1]) {
        const candidate = m[1].trim().split('\n')[0].replace(/[^\w\s.&-]/g, '').trim();
        if (candidate.length >= 4 && !/^(total|amount|invoice|date|gst|subtotal|tax)/i.test(candidate)) {
          customerCompany = candidate;
          break;
        }
      }
    }
    if (!customerCompany) {
      const fileComp = cleanBaseName
        .replace(/INV[-_]?[0-9A-Z]+/gi, '')
        .replace(/BILL[-_]?[0-9A-Z]+/gi, '')
        .replace(/[_-]/g, ' ')
        .trim();
      if (fileComp.length >= 4 && !/^(invoice|bill|receipt|scan|document|file|\d+)$/i.test(fileComp)) {
        customerCompany = fileComp.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // 3. Extract Contact Person / Name (Nullable - strictly from text, never fabricated)
    let customerName: string | null = null;
    const nameRegexes = [
      /(?:attn|attention|contact\s*person|contact\s*name|contact|name|client\s*name|poc)\s*[:\-]?\s*([A-Za-z\s.]{3,35})/i,
      /\b(?:mr\.|ms\.|mrs\.|dr\.)\s+([A-Za-z\s]{3,30})/i,
    ];
    for (const rx of nameRegexes) {
      const m = rawText.match(rx);
      if (m && m[1]) {
        const candidate = m[1].trim().split('\n')[0].replace(/[^\w\s.]/g, '').trim();
        if (candidate.length >= 3 && !/^(total|invoice|date|amount|company)/i.test(candidate)) {
          customerName = candidate;
          break;
        }
      }
    }

    // 4. Extract Email (Nullable - from user input or file text, never fabricated)
    let customerEmail: string | null = null;
    if (userEmail.trim()) {
      customerEmail = userEmail.trim();
    } else {
      const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
      if (emailMatch) {
        customerEmail = emailMatch[0].trim();
      }
    }

    // 5. Extract Phone (Nullable - from user input or file text, never fabricated)
    let customerPhone: string | null = null;
    if (userPhone.trim()) {
      customerPhone = userPhone.trim();
    } else {
      const phoneMatch = rawText.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/) || rawText.match(/\b[6-9]\d{9}\b/);
      if (phoneMatch) {
        customerPhone = phoneMatch[0].trim();
      }
    }

    // 6. Extract Amount (Nullable - strictly from document total patterns, never fabricated)
    let amount: number | null = null;
    const amountRegexes = [
      /(?:grand\s*total|total\s*amount|amount\s*due|total\s*payable|net\s*amount|balance\s*due|invoice\s*amount|total)\s*[:=]?\s*(?:₹|Rs\.?|INR|\$)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
      /(?:₹|Rs\.?|\$)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]{3,8}(?:\.[0-9]{1,2})?)/i,
    ];
    for (const rx of amountRegexes) {
      const m = rawText.match(rx);
      if (m && m[1]) {
        const parsed = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0 && parsed < 1000000000) {
          amount = Math.round(parsed);
          break;
        }
      }
    }

    // 7. Extract Due Date (Nullable - strictly from text)
    let dueDate: string | null = null;
    let daysOverdue = 0;
    const dateRegexes = [
      /(?:due\s*date|payment\s*due|due)\s*[:\-]?\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i,
    ];
    for (const rx of dateRegexes) {
      const m = rawText.match(rx);
      if (m && m[1]) {
        const rawDate = m[1].trim();
        const parsedTimestamp = Date.parse(rawDate);
        if (!isNaN(parsedTimestamp)) {
          dueDate = new Date(parsedTimestamp).toISOString().split('T')[0];
          daysOverdue = Math.max(0, Math.floor((Date.now() - parsedTimestamp) / (1000 * 60 * 60 * 24)));
          break;
        }
      }
    }

    const gstin = rawText.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/i)?.[0] || null;

    const bucket: 'early' | '15+' | '30+' | '60+' = 
      daysOverdue >= 60 ? '60+' : 
      daysOverdue >= 30 ? '30+' : 
      daysOverdue >= 15 ? '15+' : 'early';

    const recommendedSequence: CadenceIntensity = 
      bucket === '60+' || bucket === '30+' ? 'intensive' : 
      bucket === '15+' ? 'standard' : 'light';

    // Calculate genuine extraction confidence based on how many fields were matched
    const foundFieldsCount = [invoiceNumber, customerCompany, customerName, customerEmail, amount].filter(v => v !== null).length;
    const confidenceScore = Math.round(35 + (foundFieldsCount / 5) * 64.4);

    return {
      invoiceNumber,
      gstin,
      voucherNo: null,
      customerCompany,
      customerName,
      customerEmail,
      customerPhone,
      amount,
      currency: '₹',
      issueDate: null,
      dueDate,
      daysOverdue,
      bucket,
      recommendedSequence,
      isDuplicate: false,
      orderReference: null,
      confidenceScore,
      isAiExtracted: false,
      summary: null,
    };
  };

  // Accept one or many invoice files in the same Smart Invoice Intake tab.
  const handleFilesPicked = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;

    setUploadError(null);
    const items: BatchItem[] = list.map((file) => ({
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      fileName: file.name,
      fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      documentUrl: URL.createObjectURL(file),
      documentText: null,
      email: '',
      phone: '',
      status: 'queued',
      preview: null,
      error: null,
    }));
    setBatch((prev) => [...prev, ...items]);
    setActiveId((prev) => prev || items[0].id);

    // Text documents can be previewed and their contacts sniffed immediately;
    // PDFs/images get their contacts from the AI extraction result.
    items.forEach((item) => {
      const isTextDocument = item.file.type.startsWith('text/') || /\.(csv|txt)$/i.test(item.file.name);
      if (!isTextDocument) return;
      item.file.arrayBuffer()
        .then((buf) => {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/);
          setBatch((prev) => prev.map((entry) => entry.id === item.id ? {
            ...entry,
            documentText: text.slice(0, 20000),
            email: emailMatch?.[0] || entry.email,
            phone: phoneMatch?.[0] || entry.phone,
          } : entry));
        })
        .catch(() => {
          // Ignore background sniffing errors; the document preview still works.
        });
    });
  };

  const updateBatchItem = (id: string, patch: Partial<BatchItem>) => {
    setBatch((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeBatchItem = (id: string) => {
    const removed = batchRef.current.find((item) => item.id === id);
    if (removed?.documentUrl) URL.revokeObjectURL(removed.documentUrl);
    const next = batchRef.current.filter((item) => item.id !== id);
    setBatch(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  };

  const resetUploadState = () => {
    batchRef.current.forEach((item) => {
      if (item.documentUrl) URL.revokeObjectURL(item.documentUrl);
    });
    setBatch([]);
    setActiveId(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateAuditActivity = (patch: Partial<AuditActivity>) => {
    setAuditActivity((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const scheduleAuditHide = () => {
    if (auditHideTimerRef.current) window.clearTimeout(auditHideTimerRef.current);
    auditHideTimerRef.current = window.setTimeout(() => {
      setAuditActivity(null);
      auditHideTimerRef.current = null;
    }, 900);
  };

  const buildApprovalEdits = (preview: ParsedInvoicePreview): Partial<ExtractedInvoiceDraft> => ({
    party_name: preview.customerCompany || preview.customerName,
    email: preview.customerEmail,
    phone: preview.customerPhone,
    gstin: preview.gstin,
    bill_no: preview.invoiceNumber,
    voucher_no: preview.voucherNo,
    overdue_amount: preview.amount,
    running_balance: preview.amount,
    debit: preview.amount,
    due_date: preview.dueDate,
    due_date_source: preview.dueDateSource,
    payment_terms: preview.paymentTerms,
    payment_terms_days: preview.paymentTermsDays,
    transaction_date: preview.issueDate || preview.dueDate,
    oldest_due_date: preview.dueDate,
    cycle_started_date: preview.cycleStartedDate,
    max_overdue_days: preview.daysOverdue,
    summary: preview.summary,
    current_stage: preview.bucket === 'early' ? 'Friendly' : preview.bucket === '15+' ? 'Firm' : 'Escalation',
  });

  const commitApprovedInvoice = async (preview: ParsedInvoicePreview, result: InvoiceApprovalResult) => {
    if (onInvoiceApproved) {
      await onInvoiceApproved(result);
      return;
    }

    onAddInvoice({
      invoiceNumber: preview.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      customerCompany: preview.customerCompany || 'Unspecified Client',
      customerName: preview.customerName || 'Accounts Payable',
      customerEmail: preview.customerEmail || '',
      customerPhone: preview.customerPhone || '',
      amount: preview.amount ?? 0,
      currency: '₹',
      dueDate: preview.dueDate || new Date().toISOString().split('T')[0],
      daysOverdue: preview.daysOverdue,
      bucket: preview.bucket,
      cadence: preview.recommendedSequence,
      status: 'active',
      currentStage: preview.bucket === 'early' ? 'Friendly' : preview.bucket === '15+' ? 'Firm' : 'Escalation',
    });
  };

  // Shared approval path for a single review card or the whole ready batch.
  const approvePreview = async (
    preview: ParsedInvoicePreview,
    itemId: string
  ): Promise<boolean> => {
    if (!preview.draftToken || approvingRef.current) return false;

    if (!preview.customerEmail?.trim() || !preview.customerPhone?.trim()) {
      setUploadError('Add the highlighted email and phone before approving this invoice.');
      if (!preview.customerEmail?.trim()) emailFieldRef.current?.focus();
      else phoneFieldRef.current?.focus();
      return false;
    }

    if (quota?.isInvoiceLimitReached) {
      setUploadError(`Monthly quota of ${quota.invoiceLimit} invoices reached for ${planTier.toUpperCase()} tier. Please upgrade your plan to continue.`);
      if (onUpgradePrompt) {
        onUpgradePrompt(planTier === 'free' ? 'basic' : 'growth');
      }
      return false;
    }

    approvingRef.current = true;
    setIsApproving(true);
    setUploadError(null);

    try {
      const result = await approveInvoiceDraft(preview.draftToken, buildApprovalEdits(preview));

      if (!result.inserted) {
        setUploadError(result.message || 'Invoice was not added because it already exists.');
        updateBatchItem(itemId, { preview: { ...preview, isDuplicate: true } });
        if (activeId === itemId) setActiveId(itemId);
        return false;
      }

      await commitApprovedInvoice(preview, result);
      removeBatchItem(itemId);
      return true;
    } catch (err: any) {
      console.warn('Invoice approval error:', err);
      setUploadError(err?.message || 'Approval failed. No database row was created.');
      return false;
    } finally {
      approvingRef.current = false;
      setIsApproving(false);
    }
  };

  const buildPreviewFromExtraction = (
    item: BatchItem,
    result: InvoiceExtractionResult
  ): ParsedInvoicePreview => {
    const extracted = result.extracted;
    const daysOverdue = extracted.due_date
      ? Math.max(0, Math.floor((Date.now() - new Date(`${extracted.due_date}T00:00:00Z`).getTime()) / (1000 * 60 * 60 * 24)))
      : Number(extracted.max_overdue_days || 0);
    const bucket: 'early' | '15+' | '30+' | '60+' = daysOverdue >= 60
      ? '60+'
      : daysOverdue >= 30
        ? '30+'
        : daysOverdue >= 15
          ? '15+'
          : 'early';

    return {
      invoiceNumber: extracted.bill_no,
      gstin: extracted.gstin,
      voucherNo: extracted.voucher_no,
      customerCompany: extracted.party_name,
      customerName: extracted.customer_name || null,
      customerEmail: extracted.customer_email || extracted.email || item.email || null,
      customerPhone: extracted.phone || item.phone || null,
      amount: extracted.overdue_amount,
      currency: '₹',
      issueDate: extracted.transaction_date,
      dueDate: extracted.due_date,
      dueDateSource: extracted.due_date_source,
      paymentTerms: extracted.payment_terms,
      paymentTermsDays: extracted.payment_terms_days,
      daysOverdue,
      bucket,
      recommendedSequence: bucket === '60+' || bucket === '30+' ? 'intensive' : bucket === '15+' ? 'standard' : 'light',
      isDuplicate: Boolean(result.duplicate),
      confidenceScore: 96,
      isAiExtracted: true,
      summary: extracted.summary,
      cycleStartedDate: extracted.cycle_started_date,
      draftToken: result.draftToken,
      previewSequence: result.schedule_preview?.sequence || storedCadence?.sequence || defaultRecoverySequence,
      previewSource:
        result.schedule_preview?.source === 'Credentials'
          ? 'Credentials'
          : storedCadence?.sequence
            ? 'local'
            : 'default',
    };
  };

  // Extract every selected file into its own review card. Nothing is approved
  // here — each invoice stays editable until the user approves it.
  const handleProcessUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const queue = batchRef.current.filter((item) => item.status === 'queued' || item.status === 'error');
    if (!queue.length) {
      setUploadError('Select or drop one or more invoice files first.');
      return;
    }

    if (quota?.isInvoiceLimitReached) {
      setUploadError(`Monthly quota of ${quota.invoiceLimit} invoices reached for ${planTier.toUpperCase()} tier. Please upgrade your plan to continue.`);
      if (onUpgradePrompt) {
        onUpgradePrompt(planTier === 'free' ? 'basic' : 'growth');
      }
      return;
    }

    if (quota && !quota.isCustom && queue.length > quota.invoicesRemaining) {
      setUploadError(`Only ${quota.invoicesRemaining} invoice(s) left in this month's quota. Remove ${queue.length - quota.invoicesRemaining} file(s) or upgrade your plan.`);
      return;
    }

    if (auditHideTimerRef.current) {
      window.clearTimeout(auditHideTimerRef.current);
      auditHideTimerRef.current = null;
    }

    setUploadError(null);
    startExtractionAnimation();
    setIsScanning(true);
    setActiveId(queue[0].id);
    queue.forEach((item) => updateBatchItem(item.id, { status: 'extracting', error: null, preview: null }));
    setAuditActivity({
      fileName: queue.length > 1 ? `${queue.length} invoice files` : queue[0].fileName,
      invoiceLabel: 'Awaiting parse',
      stage: 'uploading',
    });

    let duplicateCount = 0;
    let failureCount = 0;

    for (const item of queue) {
      updateAuditActivity({
        fileName: item.fileName,
        invoiceLabel: 'Awaiting parse',
        stage: 'uploading',
      });

      try {
        const fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(item.file);
        });

        updateAuditActivity({ stage: 'parsing' });

        const result = await extractInvoiceWithWorkflow({
          fileBase64,
          fileName: item.fileName,
          fileType: item.file.type || 'application/pdf',
          debtorEmail: item.email,
          debtorPhone: item.phone,
          customer_uid: loggedInUid,
          userEmail: effectiveUserEmail,
          userTier: effectiveUserTier,
          userName: effectiveUserName,
          userCompany: effectiveUserCompany,
          sequence: storedCadence?.sequence || defaultRecoverySequence,
          totalDays: storedCadence?.totalDays,
        });

        const preview = buildPreviewFromExtraction(item, result);
        updateAuditActivity({
          invoiceLabel: preview.invoiceNumber || item.fileName,
          stage: 'parsed',
        });
        updateBatchItem(item.id, { status: 'ready', preview, error: null });
        if (result.duplicate) duplicateCount += 1;
      } catch (err: any) {
        console.warn('Invoice extraction error:', err);
        failureCount += 1;
        updateBatchItem(item.id, {
          status: 'error',
          error: err?.message || 'Extraction failed for this file.',
        });
      }
    }

    if (duplicateCount) {
      setUploadError(`${duplicateCount} invoice(s) look like duplicates — review them before approving.`);
    }
    if (failureCount) {
      setUploadError(`${failureCount} file(s) could not be extracted. Remove them or try again.`);
    }

    await stopExtractionAnimation();
    setIsScanning(false);
    scheduleAuditHide();
  };

  const handleApproveScanned = async () => {
    if (!scannedResult || !activeId) return;
    await approvePreview(scannedResult, activeId);
  };

  const handleApproveAll = async () => {
    const ready = batchRef.current.filter((item) => item.status === 'ready' && item.preview);
    if (!ready.length) return;

    if (quota && !quota.isCustom && ready.length > quota.invoicesRemaining) {
      setUploadError(`Only ${quota.invoicesRemaining} invoice(s) left in this month's quota. Approve fewer invoices or upgrade your plan.`);
      return;
    }

    let approvedCount = 0;
    for (const item of ready) {
      const ok = await approvePreview(item.preview!, item.id);
      if (!ok) break;
      approvedCount += 1;
    }
    if (approvedCount) {
      setAuditActivity({
        fileName: `${approvedCount} invoice(s)`,
        invoiceLabel: 'Batch approved',
        stage: 'updated',
      });
      scheduleAuditHide();
    }
  };

  // Manual Form States
  const [manualInvoiceNo, setManualInvoiceNo] = useState('');
  const [manualCompany, setManualCompany] = useState('');
  const [manualContactName, setManualContactName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualAmount, setManualAmount] = useState<number>(50000);
  const [manualDueDate, setManualDueDate] = useState('2024-10-15');

  const getManualBucket = (dueDateStr: string): 'early' | '15+' | '30+' | '60+' => {
    const due = new Date(dueDateStr).getTime();
    const diffDays = Math.max(0, Math.floor((Date.now() - due) / (1000 * 60 * 60 * 24)));
    if (diffDays >= 60) return '60+';
    if (diffDays >= 30) return '30+';
    if (diffDays >= 15) return '15+';
    return 'early';
  };

  const handleEnrollManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCompany || !manualInvoiceNo) return;

    if (quota?.isInvoiceLimitReached) {
      setUploadError(`Monthly quota of ${quota.invoiceLimit} invoices reached for ${planTier.toUpperCase()} tier. Please upgrade your plan to continue.`);
      if (onUpgradePrompt) {
        onUpgradePrompt(planTier === 'free' ? 'basic' : 'growth');
      }
      return;
    }
    
    const bucket = getManualBucket(manualDueDate);
    const cadence: CadenceIntensity = bucket === '60+' ? 'intensive' : bucket === '30+' ? 'standard' : 'light';

    onAddInvoice({
      invoiceNumber: manualInvoiceNo,
      customerCompany: manualCompany,
      customerName: manualContactName || 'Accounts Payable',
      customerEmail: manualEmail || 'ap@' + manualCompany.toLowerCase().replace(/[^a-z]/g, '') + '.in',
      customerPhone: manualPhone || '+91 98000 00000',
      amount: Number(manualAmount),
      currency: '₹',
      dueDate: manualDueDate,
      daysOverdue: Math.max(1, Math.floor((Date.now() - new Date(manualDueDate).getTime()) / (1000 * 60 * 60 * 24))),
      bucket: bucket,
      cadence: cadence,
      status: 'active',
      currentStage: bucket === 'early' ? 'Friendly' : 'Firm',
    });

    setManualInvoiceNo('');
    setManualCompany('');
    setManualContactName('');
    setManualEmail('');
    setManualPhone('');
    setManualAmount(50000);
  };

  const renderExtractField = (config: {
    label: string;
    value: string | number | null;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: 'text' | 'email' | 'tel' | 'number' | 'date';
    mono?: boolean;
    conflict?: boolean;
    missing?: boolean;
    inputRef?: React.Ref<HTMLInputElement>;
    prefix?: string;
  }) => {
    const isEmpty = config.value === null || config.value === '';

    return (
      <label className={`intake-field ${config.mono ? 'is-mono' : ''} ${isEmpty ? 'is-empty' : ''} ${config.conflict ? 'is-conflict' : ''} ${config.missing ? 'is-missing' : ''}`}>
        <span className="intake-field-label">
          {config.label}
          {config.conflict && <span className="intake-conflict-badge">Duplicate</span>}
          {config.missing && <span className="intake-missing-badge">Required</span>}
        </span>
        <span className="intake-field-control">
          {config.prefix && <span className="intake-field-prefix">{config.prefix}</span>}
          <input
            ref={config.inputRef}
            type={config.type || 'text'}
            value={config.value ?? ''}
            placeholder={config.placeholder}
            onChange={config.onChange}
          />
        </span>
      </label>
    );
  };

  const renderUploadedDocument = (scanning: boolean) => {
    const lowerName = (selectedFile?.name || '').toLowerCase();
    const isPdf = selectedFile?.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage = selectedFile?.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lowerName);
    const isText = selectedFile?.type.startsWith('text/') || /\.(csv|txt)$/i.test(lowerName);

    return (
      <div className="intake-panel document-panel flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b border-slate-200 dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-purple-600 text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                {batch.length > 1 ? `${batch.length} invoices · ${uploadedFileName}` : (uploadedFileName || 'Uploaded invoice')}
              </div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                {uploadedFileSize} • {scanning ? 'AI extraction in progress' : 'Uploaded document'}
              </div>
            </div>
          </div>
        </div>

        {batch.length > 1 && (
          <div className="intake-batch-list shrink-0">
            {batch.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={`intake-batch-item ${item.id === activeId ? 'is-active' : ''}`}
                title={item.fileName}
              >
                <span className="intake-batch-index">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate">{item.fileName}</span>
                <span className={`intake-batch-status is-${item.status}`}>
                  {item.status === 'ready' ? 'Ready' : item.status === 'extracting' ? 'Parsing' : item.status === 'error' ? 'Failed' : 'Queued'}
                </span>
              </button>
            ))}
          </div>
        )}

        {!scanning && batch.some((item) => item.status === 'queued' || item.status === 'error') && (
          <div className="shrink-0 px-3.5 py-2 border-b border-slate-200 dark:border-white/[0.08] bg-purple-50/40 dark:bg-purple-950/20">
            <button
              type="button"
              onClick={() => void handleProcessUpload()}
              className="w-full py-2 rounded-lg font-bold text-xs text-white bg-recovr-button hover:bg-recovr-button-hover transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {(() => {
                  const pending = batch.filter((item) => item.status === 'queued' || item.status === 'error').length;
                  return pending > 1 ? `Extract ${pending} Invoices & Review` : 'Extract & Review Invoice';
                })()}
              </span>
            </button>
          </div>
        )}

        <div className="relative flex-1 min-h-0">
          <InvoiceDocumentViewer
            documentUrl={documentUrl}
            isPdf={isPdf}
            isImage={isImage}
            isText={isText}
            documentText={documentText}
          />
          {scanning && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-zinc-950/95 dark:bg-black/95">
              <AiLoader />
              <span className="text-[10px] font-mono text-zinc-300">
                {isApproving ? 'Generating dates & saving...' : 'Extracting invoice details...'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const auditStageLabel = (stage: AuditStage) => {
    switch (stage) {
      case 'uploading': return 'Upload received · reading file';
      case 'parsing': return 'Parsing invoice fields';
      case 'parsed': return 'Invoice parsed';
      case 'updating': return 'Adding invoice & generating dates';
      case 'updated': return 'Invoice added & updated';
    }
  };

  const renderAuditActivity = () => {
    if (!auditActivity) return null;
    const isComplete = auditActivity.stage === 'parsed' || auditActivity.stage === 'updated';

    return (
      <div className="intake-audit-activity" role="status" aria-live="polite">
        <span className={`intake-audit-dot ${isComplete ? 'is-complete' : ''}`} />
        <div className="min-w-0">
          <div className="intake-audit-title">
            AUDIT · {auditActivity.invoiceLabel}
          </div>
          <div className="intake-audit-detail">
            {auditActivity.fileName} · {auditStageLabel(auditActivity.stage)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`intake-shell h-[calc(100vh-70px)] min-h-0 flex flex-col ${activeTab === 'smart_upload' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      {/* Unified compact toolbar: title + quota + mode switcher */}
      <div className="intake-toolbar">
        <div className="intake-toolbar-title">
          <span className="intake-title-icon"><FileText className="w-4 h-4" /></span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight leading-none">Invoice Intake</h2>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-mono uppercase tracking-wider">Extract · Verify · Approve</p>
          </div>
        </div>

        {quota && (
          <div
            className={`intake-quota ${
              quota.isInvoiceLimitReached
                ? 'is-danger'
                : quota.invoicePercent > 80
                ? 'is-warning'
                : ''
            }`}
          >
            {quota.isInvoiceLimitReached ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            )}
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">Quota</span>
            <span className="font-mono tabular-nums font-bold text-zinc-900 dark:text-white">
              {quota.invoicesUsed}/{quota.isCustom ? '∞' : quota.invoiceLimit}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400 hidden xl:inline">
              {quota.isCustom
                ? 'Unlimited'
                : quota.isInvoiceLimitReached
                ? 'Limit reached'
                : `${quota.invoicePercent}% · ${quota.invoicesRemaining} left`}
            </span>

            {quota.isInvoiceLimitReached && onUpgradePrompt && (
              <button
                type="button"
                onClick={() => onUpgradePrompt(planTier === 'free' ? 'basic' : 'growth')}
                className="ml-1 px-2 py-0.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer shadow-xs"
              >
                Upgrade
              </button>
            )}
          </div>
        )}

        {/* Mode switcher — handlers and labels preserved */}
        <div className="intake-mode-switch">
          <button
            onClick={() => setActiveTab('smart_upload')}
            className={`intake-mode-btn ${
              activeTab === 'smart_upload' ? 'is-active' : ''
            }`}
          >
            Smart Invoice Intake
          </button>
          <button
            onClick={() => setActiveTab('manual_form')}
            className={`intake-mode-btn ${
              activeTab === 'manual_form' ? 'is-active' : ''
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setActiveTab('connectors')}
            className={`intake-mode-btn flex items-center gap-1.5 ${
              activeTab === 'connectors' ? 'is-active' : ''
            }`}
          >
            <span>Connectors</span>
            <span className="text-[9px] font-mono px-1 rounded bg-slate-200 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300">
              {planTier === 'free' ? 'Basic+' : '6'}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'smart_upload' && uploadError && !scannedResult?.isDuplicate && (
        <div className="intake-inline-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* TAB 1: SMART AI UPLOAD & OCR */}
      {activeTab === 'smart_upload' && (
        <div
          className={`intake-workspace ${showSchedulePanel ? 'has-schedule' : ''} ${
            showSchedulePanel && !schedulePanelOpen ? 'schedule-collapsed' : ''
          }`}
        >
          {isScanning || batch.length > 0 ? (
            <div className="intake-workspace-pane document-pane">{renderUploadedDocument(isScanning)}</div>
          ) : (
          <div className="intake-workspace-pane form-pane">
            <div className="intake-panel intake-form-card p-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Smart Invoice Intake</h3>
              </div>

              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Drop one invoice or many at once. Each file gets its own review card; missing contacts are highlighted before approval.
              </p>

              <form onSubmit={handleProcessUpload} className="space-y-3.5">
                {/* Upload one or many invoice files */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Invoice Documents (PDF, Image, CSV, TXT) <span className="text-purple-600 dark:text-purple-400 font-bold">*</span>
                  </label>
                  
                  {/* Hidden real file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
                    onChange={(e) => {
                      if (e.target.files) handleFilesPicked(e.target.files);
                    }}
                    className="hidden"
                  />

                  {/* Dropzone / Selected File Card */}
                  {!selectedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files?.length) handleFilesPicked(e.dataTransfer.files);
                      }}
                      className={`intake-dropzone border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer group select-none ${
                        isDragOver
                          ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/20 scale-[1.01]'
                          : 'border-zinc-300 dark:border-zinc-700 hover:border-purple-500/60 dark:hover:border-purple-400/60 bg-zinc-50/70 dark:bg-[#0D0E16]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                        Drop invoice files or <span className="underline font-bold text-purple-600 dark:text-purple-400">browse files</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        Select one or many files · PDF, PNG, JPG, JPEG, WEBP, CSV and TXT
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-50/20 dark:bg-purple-950/20 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                          <Files className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {batch.length === 1 ? uploadedFileName : `${batch.length} invoices selected`}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            {batch.length === 1 ? uploadedFileSize : batchSizeLabel} • Ready for extraction
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1 rounded-md text-zinc-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                          title="Add more files"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={resetUploadState}
                          className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                          title="Remove all files"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isScanning || batch.length === 0}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-recovr-button hover:bg-recovr-button-hover transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isScanning ? (
                    <span>Extracting invoice details...</span>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {batch.length > 1
                          ? `Extract ${batch.length} Invoices & Review`
                          : 'Extract & Review Invoice'}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
          )}

          {/* AI Extraction Output */}
          <div className="intake-workspace-pane output-pane">
            <div className="intake-panel output-panel flex flex-col h-full min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pb-3.5 flex flex-col">
                <div className="intake-output-sticky">
                  <div className="intake-output-header">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white">
                      <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      <span>Extraction Output</span>
                    </div>
                    {auditActivity
                      ? renderAuditActivity()
                      : scannedResult && <span className="intake-output-badge">Editable</span>}
                  </div>

                  {!isScanning && scannedResult?.isDuplicate && (
                    <div className="duplicate-alert" role="alert">
                      <span className="duplicate-alert-pulse" />
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <div className="duplicate-alert-content">
                        <div className="duplicate-alert-title">
                          Duplicate Invoice Detected — Resolve Invoice # or GSTIN to enable approval
                        </div>
                        {uploadError && <div className="duplicate-detail">{uploadError}</div>}
                      </div>
                      <div className="duplicate-alert-actions">
                        <button
                          type="button"
                          onClick={() => invoiceFieldRef.current?.focus()}
                          className="duplicate-alert-btn"
                        >
                          Fix Invoice #
                        </button>
                        <button
                          type="button"
                          onClick={() => gstinFieldRef.current?.focus()}
                          className="duplicate-alert-btn"
                        >
                          Fix GSTIN
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isScanning && (
                  <div className="flex-1 flex flex-col items-center justify-center py-10" role="status" aria-live="polite">
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300 font-mono">
                      {isApproving ? 'Adding invoice & generating dates...' : 'Extracting invoice details...'}
                    </div>
                  </div>
                )}

                {!isScanning && !scannedResult && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400 space-y-1 py-10">
                    <FileText className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-600" />
                    <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">No invoice scanned</div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Select an invoice file on the left and click Submit to extract details.</p>
                  </div>
                )}

                {!isScanning && scannedResult && (
                  <div className="space-y-3">
                    <div className={`intake-status-strip flex items-center justify-between text-[11px] ${
                      scannedResult.isAiExtracted
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800'
                    }`}>
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${
                          scannedResult.isAiExtracted 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-zinc-400'
                        }`} />
                        <span className={
                          scannedResult.isAiExtracted 
                            ? 'text-emerald-700 dark:text-emerald-300' 
                            : 'text-zinc-600 dark:text-zinc-400'
                        }>
                          {scannedResult.isAiExtracted
                            ? 'Invoice Details Ready'
                            : 'Extracted Preview — Not Saved Yet'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-500">EDITABLE</span>
                    </div>

                    <p className="intake-hint">
                      Preview only — no Supabase row until approval. Pre-due reminders appear before the due date; the rest follow your saved sequence from the day after.
                    </p>

                    <div className="intake-field-grid">
                      {renderExtractField({
                        label: 'Invoice #',
                        value: scannedResult.invoiceNumber,
                        placeholder: 'Add invoice number',
                        onChange: (e) => setScannedResult({ ...scannedResult, invoiceNumber: e.target.value.trim() || null }),
                        mono: true,
                        conflict: scannedResult.isDuplicate,
                        inputRef: invoiceFieldRef,
                      })}
                      {renderExtractField({
                        label: 'GSTIN',
                        value: scannedResult.gstin,
                        placeholder: 'Add buyer GSTIN',
                        onChange: (e) => setScannedResult({ ...scannedResult, gstin: e.target.value.trim() || null }),
                        mono: true,
                        conflict: scannedResult.isDuplicate,
                        inputRef: gstinFieldRef,
                      })}
                      {renderExtractField({
                        label: 'Company',
                        value: scannedResult.customerCompany,
                        placeholder: 'Add buyer company',
                        onChange: (e) => setScannedResult({ ...scannedResult, customerCompany: e.target.value.trim() || null }),
                      })}
                      {renderExtractField({
                        label: 'Contact Name',
                        value: scannedResult.customerName,
                        placeholder: 'Add contact person',
                        onChange: (e) => setScannedResult({ ...scannedResult, customerName: e.target.value.trim() || null }),
                      })}
                      {renderExtractField({
                        label: 'Email',
                        value: scannedResult.customerEmail,
                        placeholder: 'Add debtor email',
                        onChange: (e) => setScannedResult({ ...scannedResult, customerEmail: e.target.value.trim() || null }),
                        type: 'email',
                        missing: !scannedResult.customerEmail,
                        inputRef: emailFieldRef,
                      })}
                      {renderExtractField({
                        label: 'Phone',
                        value: scannedResult.customerPhone,
                        placeholder: 'Add WhatsApp number',
                        onChange: (e) => setScannedResult({ ...scannedResult, customerPhone: e.target.value.trim() || null }),
                        type: 'tel',
                        missing: !scannedResult.customerPhone,
                        inputRef: phoneFieldRef,
                      })}
                      {renderExtractField({
                        label: 'Amount',
                        value: scannedResult.amount,
                        placeholder: 'Add payable amount',
                        onChange: (e) => setScannedResult({ ...scannedResult, amount: e.target.value ? Number(e.target.value) : null }),
                        type: 'number',
                        mono: true,
                        prefix: '₹',
                      })}
                      <div
                        ref={dueDatePickerRef}
                        className={`intake-field is-mono is-date ${!scannedResult.dueDate ? 'is-empty' : ''} ${dueDatePickerOpen ? 'is-open' : ''}`}
                      >
                        <span className="intake-field-label">Due Date</span>
                        <button
                          ref={dueDateTriggerRef}
                          type="button"
                          className="intake-date-trigger"
                          onClick={openDueDatePicker}
                          aria-haspopup="dialog"
                          aria-expanded={dueDatePickerOpen}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDueDate(scannedResult.dueDate)}</span>
                        </button>
                        {scannedResult.dueDateSource === 'payment_terms' && scannedResult.dueDate && (
                          <span className="intake-due-hint">
                            Calculated from {scannedResult.paymentTerms || `${scannedResult.paymentTermsDays ?? 0} days`}
                          </span>
                        )}

                        {dueDatePickerOpen && typeof document !== 'undefined' && createPortal(
                          <div
                            ref={dueDateCalendarRef}
                            className="intake-calendar"
                            role="dialog"
                            aria-label="Choose due date"
                            style={{ top: dueDatePos.top, left: dueDatePos.left }}
                          >
                            <div className="intake-calendar-header">
                              <button
                                type="button"
                                className="intake-calendar-nav"
                                aria-label="Previous month"
                                onClick={() => setDueDateMonth(new Date(calendarYear, calendarMonthIndex - 1, 1))}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <span className="intake-calendar-title">
                                {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(dueDateMonth)}
                              </span>
                              <button
                                type="button"
                                className="intake-calendar-nav"
                                aria-label="Next month"
                                onClick={() => setDueDateMonth(new Date(calendarYear, calendarMonthIndex + 1, 1))}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="intake-calendar-grid">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
                                <span key={`${label}-${index}`} className="intake-calendar-weekday">{label}</span>
                              ))}
                              {calendarCells.map((day, index) => {
                                if (!day) {
                                  return <span key={`blank-${index}`} className="intake-calendar-day is-blank" />;
                                }
                                const iso = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const selected = scannedResult.dueDate === iso;
                                return (
                                  <button
                                    type="button"
                                    key={iso}
                                    className={`intake-calendar-day ${selected ? 'is-selected' : ''} ${iso === todayIso ? 'is-today' : ''}`}
                                    onClick={() => {
                                      setScannedResult({ ...scannedResult, dueDate: iso, dueDateSource: 'due_date' });
                                      setDueDatePickerOpen(false);
                                    }}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="intake-calendar-footer">
                              <button
                                type="button"
                                className="intake-calendar-action"
                                onClick={() => {
                                  setScannedResult({ ...scannedResult, dueDate: todayIso });
                                  setDueDatePickerOpen(false);
                                }}
                              >
                                Today
                              </button>
                              <button
                                type="button"
                                className="intake-calendar-action is-clear"
                                onClick={() => {
                                  setScannedResult({ ...scannedResult, dueDate: null });
                                  setDueDatePickerOpen(false);
                                }}
                              >
                                Clear
                              </button>
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                      {scannedResult.summary && (
                        <div className="intake-summary">
                          <span className="intake-field-label">Summary</span>
                          <span className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{scannedResult.summary}</span>
                        </div>
                      )}

                      <div className="intake-meta-strip">
                        <div className="flex items-center gap-2">
                          <span className="intake-field-label">Bucket</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            scannedResult.bucket === 'early'
                              ? 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                              : scannedResult.bucket === '15+'
                              ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                              : scannedResult.bucket === '30+'
                              ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
                              : 'text-rose-700 dark:text-rose-300 bg-rose-600/20 border-rose-600/30'
                          }`}>
                            {scannedResult.bucket} ({scannedResult.daysOverdue}d overdue)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="intake-field-label">Sequence</span>
                          <span className="font-mono uppercase text-[11px] font-semibold text-zinc-900 dark:text-white">
                            {scannedResult.recommendedSequence}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {scannedResult && !isScanning && (
                <div className="intake-approval-footer shrink-0">
                  <button
                    onClick={handleApproveScanned}
                    disabled={isApproving || !scannedResult.draftToken}
                    className="w-full py-2.5 rounded-lg font-semibold text-xs text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isApproving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-zinc-500/30 border-t-zinc-700 dark:border-t-zinc-900 rounded-full animate-spin" />
                        <span>Generating dates & saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Add to Supabase</span>
                      </>
                    )}
                  </button>
                  {batch.filter((item) => item.status === 'ready' && item.preview).length > 1 && (
                    <button
                      type="button"
                      onClick={handleApproveAll}
                      disabled={isApproving}
                      className="w-full py-2 rounded-lg font-semibold text-xs text-purple-700 dark:text-purple-300 border border-purple-500/30 bg-purple-500/[0.06] hover:bg-purple-500/[0.12] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Files className="w-3.5 h-3.5" />
                      <span>Approve all ready ({batch.filter((item) => item.status === 'ready' && item.preview).length})</span>
                    </button>
                  )}
                  {(!scannedResult.customerEmail || !scannedResult.customerPhone) && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center">
                      Fill the highlighted email and phone before approving.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {showSchedulePanel && (
            <div className="intake-workspace-pane schedule-pane">
              {schedulePanelOpen ? (
                <div className="intake-panel intake-schedule-panel flex flex-col h-full min-h-0">
                  <div className="intake-schedule-panel-head">
                    <button
                      type="button"
                      className="intake-schedule-toggle"
                      onClick={() => setSchedulePanelOpen(false)}
                      title="Collapse recovery schedule"
                      aria-label="Collapse recovery schedule"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
                    <div className="intake-schedule">
                      <div className="intake-schedule-head">
                        <div className="min-w-0">
                          <div className="intake-schedule-title">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Channel-wise Recovery Schedule</span>
                          </div>
                          <div className="intake-schedule-meta">
                            Due {formatDueDate(scannedResult?.dueDate ?? null)} · First touch{' '}
                            {recoverySchedule?.firstStep
                              ? formatScheduleDate(recoverySchedule.firstStep.scheduled_date)
                              : '—'}{' '}
                            · {recoverySchedule?.steps.length || 0} steps
                          </div>
                        </div>
                        <span className="intake-schedule-source">
                          {scannedResult?.previewSource === 'Credentials'
                            ? 'Saved sequence'
                            : scannedResult?.previewSource === 'local'
                              ? 'Local sequence'
                              : 'Default sequence'}
                        </span>
                      </div>

                      <div className="mt-2 max-h-none overflow-visible pr-1">
                        <div className="relative">
                          <div className="pointer-events-none absolute bottom-3 left-[13px] top-3 w-px bg-gradient-to-b from-purple-400 via-zinc-300 to-rose-400 dark:from-purple-300 dark:via-zinc-700 dark:to-rose-500" />
                          <div className="space-y-1.5">
                            {recoverySchedule?.steps.map((step, index) => {
                              const ChannelIcon = getChannelIcon(step.channels[0]);
                              const beforeDue = step.day < 0;
                              const showDueMarker =
                                !beforeDue && recoverySchedule.steps[index - 1]?.day < 0;

                              return (
                                <React.Fragment
                                  key={`${step.id || step.day}-${step.scheduled_date}`}
                                >
                                  {showDueMarker && (
                                    <div className="relative flex items-center gap-2 py-1">
                                      <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                                        <Calendar className="w-3.5 h-3.5" />
                                      </span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300">
                                        Due date
                                      </span>
                                    </div>
                                  )}

                                  <div
                                    className={`relative flex items-center gap-2 rounded-lg border px-1.5 py-1.5 ${
                                      index === 0
                                        ? 'border-purple-500/30 bg-purple-500/[0.06]'
                                        : 'border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/50'
                                    }`}
                                  >
                                    <span
                                      title={step.channels.map(getChannelLabel).join(' / ')}
                                      className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white dark:bg-zinc-900 ${
                                        beforeDue
                                          ? 'border-purple-400 text-purple-600 dark:text-purple-300'
                                          : 'border-zinc-300 text-zinc-600 dark:border-zinc-600 dark:text-zinc-300'
                                      }`}
                                    >
                                      <ChannelIcon className="w-3.5 h-3.5" />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                                      {formatRecoveryStepBadge(step.day)}
                                    </span>
                                    <span className="shrink-0 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                      {formatScheduleDate(step.scheduled_date)}
                                    </span>
                                    <span className="intake-schedule-step-channel shrink-0 text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                      {step.channels.map(getChannelLabel).join(' / ')}
                                    </span>
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="intake-panel intake-schedule-rail"
                  onClick={() => setSchedulePanelOpen(true)}
                  title="Open recovery schedule"
                  aria-label="Open recovery schedule"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANUAL FORM */}
      {activeTab === 'manual_form' && (
        <div className="intake-secondary-panel max-w-3xl mx-auto my-4 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Manual Entry</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Ageing bucket and sequence are assigned automatically.</p>
          </div>

          <form onSubmit={handleEnrollManual} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-mono mb-1">Invoice Number</label>
                <input
                  type="text"
                  required
                  placeholder="INV-2024-001"
                  value={manualInvoiceNo}
                  onChange={(e) => setManualInvoiceNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-mono mb-1">Customer / Company</label>
                <input
                  type="text"
                  required
                  placeholder="Company Name"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-mono mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="Sarah Jenkins"
                  value={manualContactName}
                  onChange={(e) => setManualContactName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-mono mb-1">Email</label>
                <input
                  type="email"
                  placeholder="ap@company.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-mono mb-1">WhatsApp / Mobile (+91)</label>
                <input
                  type="text"
                  placeholder="+91 98000 00000"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-mono mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualAmount}
                  onChange={(e) => setManualAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-mono mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={manualDueDate}
                  onChange={(e) => setManualDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-700 dark:text-zinc-300 font-mono mb-1">Assigned Bucket</label>
                <div className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    getManualBucket(manualDueDate) === 'early'
                      ? 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                      : getManualBucket(manualDueDate) === '15+'
                      ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
                      : getManualBucket(manualDueDate) === '30+'
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : 'text-rose-700 dark:text-rose-300 bg-rose-600/20 border-rose-600/30'
                  }`}>
                    {getManualBucket(manualDueDate)}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                    Day {getManualBucket(manualDueDate) === 'early' ? 1 : getManualBucket(manualDueDate) === '15+' ? 8 : getManualBucket(manualDueDate) === '30+' ? 12 : 17}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-semibold text-xs text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Invoice</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: CONNECTORS */}
      {activeTab === 'connectors' && (
        <div className="intake-secondary-panel my-4 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Invoicing Connectors</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Sync GST & accounting invoice metadata automatically.</p>
            </div>

            {planTier === 'free' && (
              <button
                onClick={() => onUpgradePrompt('growth')}
                className="px-3 py-1 rounded-lg text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 cursor-pointer"
              >
                Upgrade to Basic+
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'tally', name: 'Tally Prime / ERP 9', synced: 54, active: true },
              { id: 'zoho', name: 'Zoho Books', synced: 38, active: true },
              { id: 'razorpay', name: 'Razorpay Invoicing & Smart Collect', synced: 26, active: true },
              { id: 'cleartax', name: 'ClearTax / GST E-Invoice', synced: 19, active: true },
              { id: 'qbo', name: 'QuickBooks India', synced: 12, active: true },
              { id: 'custom_api', name: 'Custom ERP / SAP Webhook', synced: 8, active: true },
            ].map((conn) => (
              <div
                key={conn.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#0E0F16] p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-zinc-900 dark:text-white">{conn.name}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {conn.active ? `${conn.synced} synced` : 'Inactive'}
                  </div>
                </div>

                <button className="text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-medium cursor-pointer">
                  {conn.active ? 'Configure' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
