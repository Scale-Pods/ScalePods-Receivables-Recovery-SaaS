import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Check, 
  FileSpreadsheet, 
  Image as ImageIcon 
} from 'lucide-react';
import { Invoice, PlanTier, CadenceIntensity } from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface InvoiceIntakeBlockProps {
  planTier: PlanTier;
  onAddInvoice: (newInvoice: Partial<Invoice>) => void;
  onUpgradePrompt: (tier: PlanTier) => void;
}

interface ParsedInvoicePreview {
  invoiceNumber: string;
  customerCompany: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  bucket: 'early' | '15+' | '30+' | '60+';
  recommendedSequence: CadenceIntensity;
  isDuplicate: boolean;
  orderReference?: string;
  confidenceScore: number;
}

export const InvoiceIntakeBlock: React.FC<InvoiceIntakeBlockProps> = ({
  planTier,
  onAddInvoice,
  onUpgradePrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'smart_upload' | 'manual_form' | 'connectors'>('smart_upload');
  
  // OCR Parsing States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedResult, setScannedResult] = useState<ParsedInvoicePreview | null>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);

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

  const handleRunOcr = (sample: typeof sampleFiles[0]) => {
    setSelectedSample(sample.id);
    setIsScanning(true);
    setScanProgress(25);
    setScannedResult(null);

    setTimeout(() => setScanProgress(70), 300);
    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      setScannedResult(sample.mockData);
    }, 700);
  };

  const handleEnrollScanned = () => {
    if (!scannedResult) return;
    onAddInvoice({
      invoiceNumber: scannedResult.invoiceNumber,
      customerCompany: scannedResult.customerCompany,
      customerName: scannedResult.customerName,
      customerEmail: scannedResult.customerEmail,
      customerPhone: scannedResult.customerPhone,
      amount: scannedResult.amount,
      currency: scannedResult.currency,
      dueDate: scannedResult.dueDate,
      daysOverdue: scannedResult.daysOverdue,
      bucket: scannedResult.bucket,
      cadence: scannedResult.recommendedSequence,
      status: 'active',
      currentStage: scannedResult.bucket === 'early' ? 'Friendly' : scannedResult.bucket === '15+' ? 'Firm' : 'Escalation',
    });
    setScannedResult(null);
    setSelectedSample(null);
  };

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
          {/* Upload Dropzone & Sample Presets */}
          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 space-y-3 shadow-sm">
              {/* Drag & Drop Zone */}
              <div 
                onClick={() => handleRunOcr(sampleFiles[0])}
                className="border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 rounded-xl p-6 bg-zinc-50/70 dark:bg-[#0D0E16] transition-all text-center cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                  Drop invoice file or <span className="underline font-bold text-zinc-900 dark:text-zinc-100">browse</span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  PDF, PNG, JPG, or Excel
                </div>
              </div>

              {/* Sample Presets */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">Quick Test Files:</div>
                <div className="space-y-1.5">
                  {sampleFiles.map((sample) => {
                    const isSelected = selectedSample === sample.id;
                    return (
                      <div
                        key={sample.id}
                        onClick={() => handleRunOcr(sample)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-zinc-900 dark:border-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 shadow-sm'
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
                              {formatINR(sample.mockData.amount)} • {sample.mockData.bucket} bucket
                            </div>
                          </div>
                        </div>

                        <button className="px-2.5 py-1 rounded text-[11px] font-mono bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 font-medium cursor-pointer">
                          Scan
                        </button>
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
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                      {scannedResult.confidenceScore}% Confidence
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
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Select a test file on the left to extract details.</p>
                  </div>
                )}

                {!isScanning && scannedResult && (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Verified unique</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">OK</span>
                    </div>

                    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16] divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                      <div className="p-2.5 flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-mono">Invoice</span>
                        <span className="font-mono font-semibold text-zinc-900 dark:text-white">{scannedResult.invoiceNumber}</span>
                      </div>
                      <div className="p-2.5 flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-mono">Customer</span>
                        <span className="font-medium text-zinc-900 dark:text-white">{scannedResult.customerCompany}</span>
                      </div>
                      <div className="p-2.5 flex justify-between">
                        <span className="text-zinc-500 dark:text-zinc-400 font-mono">Amount</span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">{formatINR(scannedResult.amount)}</span>
                      </div>
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
