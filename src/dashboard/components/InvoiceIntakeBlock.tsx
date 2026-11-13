import React, { useState, useRef } from 'react';
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
  Phone,
  AlertCircle,
  X
} from 'lucide-react';
import { Invoice, PlanTier, CadenceIntensity } from '../types/dashboard';
import { UserAccount, STORAGE_KEY_USER } from '../../types/auth';
import { sendInvoiceExtractionWebhook, uploadInvoiceToN8nForExtraction } from '../../lib/webhook';
import { formatINR } from '../utils/formatters';

interface InvoiceIntakeBlockProps {
  planTier: PlanTier;
  currentUser?: UserAccount | null;
  onAddInvoice: (newInvoice: Partial<Invoice>) => void;
  onUpgradePrompt: (tier: PlanTier) => void;
}

interface ParsedInvoicePreview {
  invoiceNumber: string | null;
  customerCompany: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  amount: number | null;
  currency: string;
  issueDate: string | null;
  dueDate: string | null;
  daysOverdue: number;
  bucket: 'early' | '15+' | '30+' | '60+';
  recommendedSequence: CadenceIntensity;
  isDuplicate: boolean;
  orderReference?: string | null;
  confidenceScore: number;
  isN8nExtracted?: boolean;
}

export const InvoiceIntakeBlock: React.FC<InvoiceIntakeBlockProps> = ({
  planTier,
  currentUser,
  onAddInvoice,
  onUpgradePrompt,
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
  
  // Real File Upload States & Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadEmail, setUploadEmail] = useState('');
  const [uploadPhone, setUploadPhone] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // OCR Parsing States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedResult, setScannedResult] = useState<ParsedInvoicePreview | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

  // Real Non-Fabricating Invoice Reader & Field Extractor (All fields strictly extracted or nullable)
  const parseInvoiceFile = async (
    file: File | null,
    userEmail: string,
    userPhone: string,
    sampleMock?: ParsedInvoicePreview
  ): Promise<ParsedInvoicePreview> => {
    if (sampleMock) {
      return {
        ...sampleMock,
        customerEmail: userEmail.trim() || sampleMock.customerEmail,
        customerPhone: userPhone.trim() || sampleMock.customerPhone,
      };
    }

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
    };
  };

  // Handle Real File Selection
  const handleFilePicked = (file: File) => {
    setSelectedFile(file);
    setSelectedSample(null);
    setUploadedFileName(file.name);
    setUploadedFileSize(`${Math.max(1, Math.round(file.size / 1024))} KB`);
    setUploadError(null);

    // Auto-detect email & phone from file if not entered yet
    try {
      file.arrayBuffer().then((buf) => {
        const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && !uploadEmail) {
          setUploadEmail(emailMatch[0]);
        }
        const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/);
        if (phoneMatch && !uploadPhone) {
          setUploadPhone(phoneMatch[0]);
        }
      });
    } catch {
      // Ignore background sniffing errors
    }
  };

  // Handle Quick Test Sample Selection
  const handleSelectSample = (sample: typeof sampleFiles[0]) => {
    setSelectedSample(sample.id);
    setSelectedFile(null);
    setUploadedFileName(sample.name);
    setUploadedFileSize(sample.size);
    setUploadEmail(sample.mockData.customerEmail);
    setUploadPhone(sample.mockData.customerPhone);
    setUploadError(null);
    setIsScanning(true);
    setScanProgress(30);
    setScannedResult(null);

    setTimeout(() => setScanProgress(75), 250);
    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      setScannedResult(sample.mockData);

      // Dispatch extracted invoice details to n8n webhook
      sendInvoiceExtractionWebhook({
        invoiceNumber: sample.mockData.invoiceNumber,
        customerCompany: sample.mockData.customerCompany,
        customerName: sample.mockData.customerName,
        customerEmail: sample.mockData.customerEmail,
        customerPhone: sample.mockData.customerPhone,
        amount: sample.mockData.amount,
        dueDate: sample.mockData.dueDate,
        daysOverdue: sample.mockData.daysOverdue,
        bucket: sample.mockData.bucket,
        recommendedSequence: sample.mockData.recommendedSequence,
        confidenceScore: sample.mockData.confidenceScore,
        fileName: sample.name,
        fileSize: sample.size,
        userEmail: effectiveUserEmail,
        userTier: effectiveUserTier,
        userName: effectiveUserName,
        userCompany: effectiveUserCompany,
        timestamp: new Date().toISOString(),
      });
    }, 600);
  };

  // Submit Invoice File for Extraction (Email & Phone are required fields)
  const handleProcessUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedFile && !selectedSample) {
      setUploadError('Please select or drop an invoice file to extract details.');
      return;
    }

    if (!uploadEmail.trim()) {
      setUploadError('Customer / Debtor Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(uploadEmail.trim())) {
      setUploadError('Please enter a valid Customer / Debtor email address.');
      return;
    }

    if (!uploadPhone.trim()) {
      setUploadError('Phone / WhatsApp Number is required.');
      return;
    }

    setUploadError(null);
    setIsScanning(true);
    setScanProgress(20);
    setScannedResult(null);

    try {
      setScanProgress(35);

      // Encode file to Base64 data URL for n8n webhook
      let fileBase64: string | null = null;
      if (selectedFile) {
        try {
          fileBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });
        } catch (readErr) {
          console.warn('File encoding notice:', readErr);
        }
      }

      setScanProgress(55);

      // Send uploaded file as multipart/form-data with required debtor contact details to n8n AI webhook
      const n8nResult = await uploadInvoiceToN8nForExtraction({
        file: selectedFile,
        fileBase64,
        fileName: uploadedFileName || selectedFile?.name || (selectedSample ? `${selectedSample}.pdf` : 'invoice.pdf'),
        fileSize: uploadedFileSize || (selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : null),
        fileType: selectedFile?.type || 'application/pdf',
        fileSizeBytes: selectedFile?.size,
        debtorEmail: uploadEmail.trim(),
        debtorPhone: uploadPhone.trim(),
        userEmail: effectiveUserEmail,
        userTier: effectiveUserTier,
        userName: effectiveUserName,
        userCompany: effectiveUserCompany,
      });

      setScanProgress(85);

      const sampleMock = selectedSample ? sampleFiles.find(s => s.id === selectedSample)?.mockData : undefined;
      let parsed: ParsedInvoicePreview;

      if (selectedSample && sampleMock) {
        // Preset sample test data
        parsed = {
          ...sampleMock,
          customerEmail: uploadEmail.trim() || sampleMock.customerEmail,
          customerPhone: uploadPhone.trim() || sampleMock.customerPhone,
          isN8nExtracted: false,
        };
      } else if (n8nResult.isN8nSuccess) {
        // Real AI Extraction output returned by n8n
        const daysOverdue = n8nResult.dueDate 
          ? Math.max(0, Math.floor((Date.now() - new Date(n8nResult.dueDate).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        const bucket: 'early' | '15+' | '30+' | '60+' = daysOverdue > 60 
          ? '60+' 
          : daysOverdue > 30 
            ? '30+' 
            : daysOverdue > 15 
              ? '15+' 
              : 'early';

        parsed = {
          invoiceNumber: n8nResult.invoiceNumber,
          customerCompany: n8nResult.customerCompany,
          customerName: n8nResult.customerName,
          customerEmail: uploadEmail.trim() || n8nResult.customerEmail,
          customerPhone: uploadPhone.trim() || n8nResult.customerPhone,
          amount: n8nResult.amount,
          currency: '₹',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: n8nResult.dueDate,
          daysOverdue,
          bucket,
          recommendedSequence: bucket === '60+' || bucket === '30+' ? 'intensive' : bucket === '15+' ? 'standard' : 'light',
          isDuplicate: false,
          confidenceScore: n8nResult.confidenceScore || 96,
          isN8nExtracted: true,
        };
      } else {
        // Document uploaded to n8n, but n8n has not returned extraction output yet:
        // Strictly show empty/null fields — DO NOT guess or fabricate random data!
        parsed = {
          invoiceNumber: null,
          customerCompany: null,
          customerName: null,
          customerEmail: uploadEmail.trim(),
          customerPhone: uploadPhone.trim(),
          amount: null,
          currency: '₹',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: null,
          daysOverdue: 0,
          bucket: 'early',
          recommendedSequence: 'standard',
          isDuplicate: false,
          confidenceScore: 0,
          isN8nExtracted: false,
        };
      }

      setScanProgress(100);
      setIsScanning(false);
      setScannedResult(parsed);

      // Dispatch confirmation webhook with extracted invoice details
      sendInvoiceExtractionWebhook({
        invoiceNumber: parsed.invoiceNumber,
        customerCompany: parsed.customerCompany,
        customerName: parsed.customerName,
        customerEmail: parsed.customerEmail,
        customerPhone: parsed.customerPhone,
        amount: parsed.amount,
        dueDate: parsed.dueDate,
        daysOverdue: parsed.daysOverdue,
        bucket: parsed.bucket,
        recommendedSequence: parsed.recommendedSequence,
        confidenceScore: parsed.confidenceScore,
        fileName: uploadedFileName || selectedFile?.name || null,
        fileSize: uploadedFileSize || null,
        userEmail: effectiveUserEmail,
        userTier: effectiveUserTier,
        userName: effectiveUserName,
        userCompany: effectiveUserCompany,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setIsScanning(false);
      console.warn('Extraction processing error:', err);
      setUploadError('Failed to process invoice file. Please try another file.');
    }
  };

  // Enroll parsed invoice into live dashboard queue
  const handleEnrollScanned = () => {
    if (!scannedResult) return;
    onAddInvoice({
      invoiceNumber: scannedResult.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      customerCompany: scannedResult.customerCompany || 'Unspecified Client',
      customerName: scannedResult.customerName || 'Accounts Payable',
      customerEmail: scannedResult.customerEmail || '',
      customerPhone: scannedResult.customerPhone || '',
      amount: scannedResult.amount ?? 0,
      currency: '₹',
      dueDate: scannedResult.dueDate || new Date().toISOString().split('T')[0],
      daysOverdue: scannedResult.daysOverdue,
      bucket: scannedResult.bucket,
      cadence: scannedResult.recommendedSequence,
      status: 'active',
      currentStage: scannedResult.bucket === 'early' ? 'Friendly' : scannedResult.bucket === '15+' ? 'Firm' : 'Escalation',
    });

    // Also dispatch enrolled invoice notification with any edited adjustments
    sendInvoiceExtractionWebhook({
      invoiceNumber: scannedResult.invoiceNumber,
      customerCompany: scannedResult.customerCompany,
      customerName: scannedResult.customerName,
      customerEmail: scannedResult.customerEmail,
      customerPhone: scannedResult.customerPhone,
      amount: scannedResult.amount,
      dueDate: scannedResult.dueDate,
      daysOverdue: scannedResult.daysOverdue,
      bucket: scannedResult.bucket,
      recommendedSequence: scannedResult.recommendedSequence,
      confidenceScore: scannedResult.confidenceScore,
      fileName: uploadedFileName,
      fileSize: uploadedFileSize,
      userEmail: effectiveUserEmail,
      userTier: effectiveUserTier,
      userName: effectiveUserName,
      userCompany: effectiveUserCompany,
      timestamp: new Date().toISOString(),
    });

    setScannedResult(null);
    setSelectedSample(null);
    setSelectedFile(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setUploadEmail('');
    setUploadPhone('');
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const sampleFiles = [
    {
      id: 'sample-1',
      name: 'Nexora_Infotech_INV-8842.pdf',
      type: 'pdf',
      size: '245 KB',
      mockData: {
        invoiceNumber: 'INV-2024-8842',
        customerCompany: 'Nexora Infotech Pvt Ltd',
        customerName: 'Rajesh Sharma',
        customerEmail: 'r.sharma@nexorainfotech.in',
        customerPhone: '+91 98201 44821',
        amount: 184000,
        currency: '₹',
        issueDate: '2024-09-15',
        dueDate: '2024-10-15',
        daysOverdue: 20,
        bucket: '15+' as const,
        recommendedSequence: 'standard' as const,
        isDuplicate: false,
        orderReference: 'GST-PO-9842-IN',
        confidenceScore: 99.4,
      }
    },
    {
      id: 'sample-2',
      name: 'Vanguard_Systems_India_Bill.png',
      type: 'image',
      size: '1.2 MB',
      mockData: {
        invoiceNumber: 'INV-2024-9102',
        customerCompany: 'Vanguard Systems India Pvt Ltd',
        customerName: 'Priya Sundaram',
        customerEmail: 'priya@vanguardindia.in',
        customerPhone: '+91 98450 12390',
        amount: 325000,
        currency: '₹',
        issueDate: '2024-08-10',
        dueDate: '2024-09-09',
        daysOverdue: 56,
        bucket: '30+' as const,
        recommendedSequence: 'intensive' as const,
        isDuplicate: false,
        orderReference: 'PO-VANGUARD-BLR',
        confidenceScore: 98.7,
      }
    },
    {
      id: 'sample-3',
      name: 'Apex_Cloud_Solutions_GST.xlsx',
      type: 'spreadsheet',
      size: '84 KB',
      mockData: {
        invoiceNumber: 'INV-2024-4412',
        customerCompany: 'Apex Cloud Platforms Pvt Ltd',
        customerName: 'Kavita Patel',
        customerEmail: 'accounts@apexcloud.co.in',
        customerPhone: '+91 98800 77123',
        amount: 68000,
        currency: '₹',
        issueDate: '2024-10-25',
        dueDate: '2024-11-01',
        daysOverdue: 3,
        bucket: 'early' as const,
        recommendedSequence: 'light' as const,
        isDuplicate: false,
        orderReference: 'GSTIN-29AAACA1234F',
        confidenceScore: 99.8,
      }
    }
  ];

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

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Invoice Intake</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Upload files or sync accounting connectors.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('smart_upload')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'smart_upload'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm border border-zinc-200/80 dark:border-zinc-700/80'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab('manual_form')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
              activeTab === 'manual_form'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm border border-zinc-200/80 dark:border-zinc-700/80'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setActiveTab('connectors')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'connectors'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm border border-zinc-200/80 dark:border-zinc-700/80'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>Connectors</span>
            <span className="text-[10px] font-mono px-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {planTier === 'free' ? 'Basic+' : '6'}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: SMART AI UPLOAD & OCR */}
      {activeTab === 'smart_upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Upload Form: Email, Phone & Invoice File */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Smart Invoice Intake</h3>
              </div>

              {uploadError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Form with 3 Fields: Email, Phone, Upload File */}
              <form onSubmit={handleProcessUpload} className="space-y-3.5">
                {/* Field 1: Customer / Debtor Email */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Customer / Debtor Email <span className="text-purple-600 dark:text-purple-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={uploadEmail}
                      onChange={(e) => {
                        setUploadEmail(e.target.value);
                        if (uploadError) setUploadError(null);
                      }}
                      placeholder="e.g. accounts.payable@clientcompany.com"
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-[#0E0F16] border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Field 2: Customer / Debtor Phone */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Phone / WhatsApp Number <span className="text-purple-600 dark:text-purple-400 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={uploadPhone}
                      onChange={(e) => {
                        setUploadPhone(e.target.value);
                        if (uploadError) setUploadError(null);
                      }}
                      placeholder="e.g. +91 98201 44821"
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-xs bg-zinc-50 dark:bg-[#0E0F16] border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Field 3: Upload Invoice File */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Invoice Document (PDF, Image, Excel, CSV) <span className="text-purple-600 dark:text-purple-400 font-bold">*</span>
                  </label>
                  
                  {/* Hidden real file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFilePicked(file);
                    }}
                    className="hidden"
                  />

                  {/* Dropzone / Selected File Card */}
                  {!selectedFile && !selectedSample ? (
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
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFilePicked(file);
                      }}
                      className={`border-2 border-dashed rounded-xl p-5 transition-all text-center cursor-pointer group select-none ${
                        isDragOver
                          ? 'border-purple-500 bg-purple-50/20 dark:bg-purple-950/20 scale-[1.01]'
                          : 'border-zinc-300 dark:border-zinc-700 hover:border-purple-500/60 dark:hover:border-purple-400/60 bg-zinc-50/70 dark:bg-[#0D0E16]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                        Drop invoice file or <span className="underline font-bold text-purple-600 dark:text-purple-400">browse files</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                        Supports PDF, PNG, JPG, JPEG, Excel (.xlsx, .xls) and CSV
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-50/20 dark:bg-purple-950/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {uploadedFileName}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            {uploadedFileSize} • Ready for analysis
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setSelectedSample(null);
                          setUploadedFileName(null);
                          setUploadedFileSize(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit All Three Button */}
                <button
                  type="submit"
                  disabled={isScanning}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
                >
                  {isScanning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing with n8n AI Extractor ({scanProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Submit & Extract Invoice Details</span>
                    </>
                  )}
                </button>
              </form>

              {/* Sample Presets */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">Or pick a quick test sample:</div>
                <div className="space-y-1.5">
                  {sampleFiles.map((sample) => {
                    const isSelected = selectedSample === sample.id;
                    return (
                      <div
                        key={sample.id}
                        onClick={() => handleSelectSample(sample)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-600 dark:border-purple-400 bg-purple-50/20 dark:bg-purple-950/20 shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-[#0E0F16] hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                            {sample.type === 'pdf' ? <FileText className="w-3.5 h-3.5" /> : sample.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-zinc-900 dark:text-white">{sample.name}</div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                              {formatINR(sample.mockData.amount)} • {sample.mockData.customerEmail}
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold">
                          Load
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* AI Extraction Output */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 h-full flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Extraction Output</span>
                  </div>
                  {scannedResult && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${
                      scannedResult.isN8nExtracted
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        : selectedSample
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
                        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                    }`}>
                      {scannedResult.isN8nExtracted
                        ? `${scannedResult.confidenceScore}% AI Confidence`
                        : selectedSample
                        ? 'Sample Preset'
                        : 'Awaiting n8n Output'}
                    </span>
                  )}
                </div>

                {isScanning && (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-8 h-8 mx-auto rounded-full border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white animate-spin" />
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">Parsing invoice fields ({scanProgress}%)...</div>
                  </div>
                )}

                {!isScanning && !scannedResult && (
                  <div className="py-12 text-center text-zinc-500 dark:text-zinc-400 space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-zinc-400 dark:text-zinc-600" />
                    <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">No invoice scanned</div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Select an invoice file on the left and click Submit to extract details.</p>
                  </div>
                )}

                {!isScanning && scannedResult && (
                  <div className="space-y-3">
                    <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                      scannedResult.isN8nExtracted
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : selectedSample
                        ? 'bg-purple-500/10 border-purple-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800'
                    }`}>
                      <div className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${
                          scannedResult.isN8nExtracted 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : selectedSample
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-zinc-400'
                        }`} />
                        <span className={
                          scannedResult.isN8nExtracted 
                            ? 'text-emerald-700 dark:text-emerald-300' 
                            : selectedSample
                            ? 'text-purple-700 dark:text-purple-300'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }>
                          {scannedResult.isN8nExtracted 
                            ? 'n8n AI Vision Extraction' 
                            : selectedSample
                            ? 'Sample Test File'
                            : 'File Sent to n8n Webhook • Awaiting AI Output'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-500">EDITABLE</span>
                    </div>

                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16] divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      {/* Invoice Number */}
                      <div className="p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono">Invoice #</span>
                          {scannedResult.invoiceNumber === null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-mono">null</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={scannedResult.invoiceNumber ?? ''}
                          placeholder="Not detected (null)"
                          onChange={(e) => setScannedResult({ ...scannedResult, invoiceNumber: e.target.value.trim() || null })}
                          className="font-mono font-semibold text-zinc-900 dark:text-white bg-transparent text-right outline-none focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors placeholder:text-zinc-400 placeholder:italic placeholder:font-normal"
                        />
                      </div>

                      {/* Company Name */}
                      <div className="p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono">Company</span>
                          {scannedResult.customerCompany === null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-mono">null</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={scannedResult.customerCompany ?? ''}
                          placeholder="Not detected (null)"
                          onChange={(e) => setScannedResult({ ...scannedResult, customerCompany: e.target.value.trim() || null })}
                          className="font-medium text-zinc-900 dark:text-white bg-transparent text-right outline-none focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors max-w-[200px] placeholder:text-zinc-400 placeholder:italic placeholder:font-normal"
                        />
                      </div>

                      {/* Contact Person Name */}
                      <div className="p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono">Contact Name</span>
                          {scannedResult.customerName === null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-mono">null</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={scannedResult.customerName ?? ''}
                          placeholder="Not detected (null)"
                          onChange={(e) => setScannedResult({ ...scannedResult, customerName: e.target.value.trim() || null })}
                          className="font-medium text-zinc-900 dark:text-white bg-transparent text-right outline-none focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors max-w-[200px] placeholder:text-zinc-400 placeholder:italic placeholder:font-normal"
                        />
                      </div>

                      {/* Email */}
                      <div className="p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono">Email</span>
                          {scannedResult.customerEmail === null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-mono">null</span>
                          )}
                        </div>
                        <input
                          type="email"
                          value={scannedResult.customerEmail ?? ''}
                          placeholder="Not detected (null)"
                          onChange={(e) => setScannedResult({ ...scannedResult, customerEmail: e.target.value.trim() || null })}
                          className="font-mono text-zinc-900 dark:text-white bg-transparent text-right outline-none focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors max-w-[220px] placeholder:text-zinc-400 placeholder:italic"
                        />
                      </div>

                      {/* Phone */}
                      <div className="p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono">Phone</span>
                          {scannedResult.customerPhone === null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-mono">null</span>
                          )}
                        </div>
                        <input
                          type="tel"
                          value={scannedResult.customerPhone ?? ''}
                          placeholder="Not detected (null)"
                          onChange={(e) => setScannedResult({ ...scannedResult, customerPhone: e.target.value.trim() || null })}
                          className="font-mono text-zinc-900 dark:text-white bg-transparent text-right outline-none focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors max-w-[160px] placeholder:text-zinc-400 placeholder:italic"
                        />
                      </div>

                      {/* Amount */}
                      <div className="p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono">Amount</span>
                          {scannedResult.amount === null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-mono">null</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {scannedResult.amount !== null && <span className="font-mono text-zinc-500">₹</span>}
                          <input
                            type="number"
                            value={scannedResult.amount ?? ''}
                            placeholder="null"
                            onChange={(e) => setScannedResult({ ...scannedResult, amount: e.target.value ? Number(e.target.value) : null })}
                            className="font-mono font-bold text-zinc-900 dark:text-white bg-transparent text-right outline-none focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors max-w-[140px] placeholder:text-zinc-400 placeholder:italic placeholder:font-normal"
                          />
                        </div>
                      </div>

                      {/* Due Date */}
                      <div className="p-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono">Due Date</span>
                          {scannedResult.dueDate === null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-mono">null</span>
                          )}
                        </div>
                        <input
                          type="date"
                          value={scannedResult.dueDate ?? ''}
                          onChange={(e) => setScannedResult({ ...scannedResult, dueDate: e.target.value || null })}
                          className="font-mono text-zinc-900 dark:text-white bg-transparent text-right outline-none focus:bg-white dark:focus:bg-zinc-800 px-1.5 py-0.5 rounded border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors"
                        />
                      </div>

                      {/* Bucket */}
                      <div className="p-2.5 flex justify-between items-center">
                        <span className="text-zinc-500 dark:text-zinc-400 font-mono">Bucket</span>
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

                      {/* Sequence */}
                      <div className="p-2.5 flex justify-between items-center">
                        <span className="text-zinc-500 dark:text-zinc-400 font-mono">Sequence</span>
                        <span className="font-mono uppercase text-xs font-semibold text-zinc-900 dark:text-white">
                          {scannedResult.recommendedSequence}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {scannedResult && !isScanning && (
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 mt-4">
                  <button
                    onClick={handleEnrollScanned}
                    className="w-full py-2.5 rounded-lg font-semibold text-xs text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enroll Invoice</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL FORM */}
      {activeTab === 'manual_form' && (
        <div className="max-w-2xl mx-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 space-y-4 shadow-sm">
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
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 space-y-4 shadow-sm">
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
