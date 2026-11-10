import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Lock,
  Building,
  FileCheck,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Invoice } from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface CustomerPortalModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onPaymentSuccess: (invoice: Invoice, amountPaid: number, method: string) => void;
  onReportPaidHold: (invoice: Invoice, proofNotes: string) => void;
  onUploadProof: (invoice: Invoice, fileName: string) => void;
  onRaiseDispute: (invoice: Invoice, reason: string) => void;
}

export const CustomerPortalModal: React.FC<CustomerPortalModalProps> = ({
  invoice,
  onClose,
  onPaymentSuccess,
  onReportPaidHold,
  onUploadProof,
  onRaiseDispute,
}) => {
  if (!invoice) return null;

  const [activeTab, setActiveTab] = useState<'pay_full' | 'pay_part' | 'already_paid' | 'proof_upload' | 'dispute'>('pay_full');
  const [partAmount, setPartAmount] = useState<number>(Math.round(invoice.amount / 2));
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [alreadyPaidReported, setAlreadyPaidReported] = useState(false);
  const [proofFileUploaded, setProofFileUploaded] = useState(false);
  const [disputeReported, setDisputeReported] = useState(false);

  const [disputeText, setDisputeText] = useState('');
  const [bankRefText, setBankRefText] = useState('');

  const handlePay = (isPart: boolean = false) => {
    setIsProcessingPayment(true);
    const amountToPay = isPart ? partAmount : invoice.amount;
    
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentCompleted(true);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#8B5CF6', '#10B981', '#FFFFFF']
      });
      onPaymentSuccess(invoice, amountToPay, paymentMethod === 'upi' ? 'UPI / QR' : paymentMethod === 'card' ? 'CARD' : 'NETBANKING');
    }, 800);
  };

  const handleConfirmAlreadyPaid = () => {
    setAlreadyPaidReported(true);
    onReportPaidHold(invoice, bankRefText ? `Bank UTR: ${bankRefText}` : 'Payment reported via portal');
  };

  const handleSimulateFileUpload = (fileName: string = 'HDFC_Bank_Payment_Receipt.pdf') => {
    setProofFileUploaded(true);
    onUploadProof(invoice, fileName);
  };

  const handleConfirmDispute = () => {
    if (!disputeText.trim()) return;
    setDisputeReported(true);
    onRaiseDispute(invoice, disputeText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-xl bg-white dark:bg-[#090A10] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl text-zinc-900 dark:text-zinc-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white">Razorpay Secure B2B Checkout</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">Invoice #{invoice.invoiceNumber}</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="px-5 py-3 bg-zinc-50/50 dark:bg-[#0D0E16] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-900 dark:text-white">{invoice.customerCompany}</div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{invoice.daysOverdue}d overdue</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold font-mono text-zinc-900 dark:text-white">{formatINR(invoice.amount)}</div>
          </div>
        </div>

        {/* Success States */}
        {paymentCompleted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto" />
            <div className="text-sm font-bold text-zinc-900 dark:text-white">Payment Received</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Invoice #{invoice.invoiceNumber} marked settled. Reminders stopped.</p>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-800 text-white hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : alreadyPaidReported ? (
          <div className="p-8 text-center space-y-3">
            <Clock className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto" />
            <div className="text-sm font-bold text-zinc-900 dark:text-white">3-Day Hold Active</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Reminders paused for 3 business days while accounts verifies bank NEFT/RTGS UTR.</p>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-800 text-white hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : disputeReported ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-purple-500 dark:text-purple-400 mx-auto" />
            <div className="text-sm font-bold text-zinc-900 dark:text-white">Dispute Logged</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Ticket sent to accounts manager. Reminders paused.</p>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-800 text-white hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        ) : (
          <div>
            {/* Tabs */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0A0B10] px-4 text-xs overflow-x-auto">
              {[
                { id: 'pay_full', label: 'Pay Full' },
                { id: 'pay_part', label: 'Pay Part' },
                { id: 'already_paid', label: 'I Have Paid' },
                { id: 'proof_upload', label: 'Upload Proof' },
                { id: 'dispute', label: 'Dispute' },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2.5 px-3 font-medium border-b-2 whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-purple-500 text-purple-600 dark:text-purple-300 font-bold'
                        : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Pay Full */}
            {activeTab === 'pay_full' && (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'upi', label: 'UPI / QR' },
                    { id: 'card', label: 'RuPay / Cards' },
                    { id: 'netbanking', label: 'NetBanking' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        paymentMethod === m.id
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-600/20 text-purple-700 dark:text-white font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0D0E16] p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Principal Amount</span>
                    <span className="text-zinc-900 dark:text-white">{formatINR(invoice.amount)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                    <span>Convenience Fee</span>
                    <span className="text-emerald-600 dark:text-emerald-400">₹0 (Free)</span>
                  </div>
                  <div className="pt-1.5 border-t border-zinc-200 dark:border-zinc-800 flex justify-between font-bold text-zinc-900 dark:text-white">
                    <span>Total Due</span>
                    <span className="text-purple-600 dark:text-purple-300">{formatINR(invoice.amount)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePay(false)}
                  disabled={isProcessingPayment}
                  className="w-full py-2.5 rounded-lg font-semibold text-xs text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isProcessingPayment ? 'Processing via Razorpay...' : `Pay ${formatINR(invoice.amount)}`}</span>
                </button>
              </div>
            )}

            {/* Tab 2: Pay Part */}
            {activeTab === 'pay_part' && (
              <div className="p-5 space-y-4">
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0D0E16] p-3.5 space-y-3">
                  <div className="flex justify-between text-xs text-zinc-700 dark:text-zinc-300">
                    <span>Amount today:</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-300">{formatINR(partAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={invoice.amount}
                    step={1000}
                    value={partAmount}
                    onChange={(e) => setPartAmount(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>₹1,000 min</span>
                    <span>Remaining: {formatINR(invoice.amount - partAmount)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePay(true)}
                  disabled={isProcessingPayment}
                  className="w-full py-2.5 rounded-lg font-semibold text-xs text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isProcessingPayment ? 'Processing...' : `Pay ${formatINR(partAmount)}`}</span>
                </button>
              </div>
            )}

            {/* Tab 3: I Have Paid */}
            {activeTab === 'already_paid' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-zinc-700 dark:text-zinc-300 mb-1">
                    Bank NEFT / RTGS Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-HDFC98214829104"
                    value={bankRefText}
                    onChange={(e) => setBankRefText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>Pauses outreach for 3 business days while accounts team verifies UTR credit.</span>
                </div>

                <button
                  onClick={handleConfirmAlreadyPaid}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                >
                  Confirm Paid
                </button>
              </div>
            )}

            {/* Tab 4: Upload Proof */}
            {activeTab === 'proof_upload' && (
              <div className="p-5 space-y-4">
                {proofFileUploaded ? (
                  <div className="p-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-center space-y-1">
                    <FileCheck className="w-7 h-7 text-emerald-500 dark:text-emerald-400 mx-auto" />
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">Proof Uploaded</div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Status: Received (HDFC Advice Attached)</p>
                  </div>
                ) : (
                  <div
                    onClick={() => handleSimulateFileUpload('HDFC_Bank_Payment_Receipt.pdf')}
                    className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg p-6 text-center hover:border-purple-500/50 cursor-pointer transition-all"
                  >
                    <Upload className="w-6 h-6 text-purple-500 dark:text-purple-400 mx-auto mb-1.5" />
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white">Upload Bank UTR slip or PDF</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">PDF, PNG, JPG</div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Dispute */}
            {activeTab === 'dispute' && (
              <div className="p-5 space-y-3">
                <textarea
                  rows={3}
                  placeholder="Describe dispute reason or PO/GST mismatch..."
                  value={disputeText}
                  onChange={(e) => setDisputeText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />

                <button
                  onClick={handleConfirmDispute}
                  disabled={!disputeText.trim()}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  Submit Dispute
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Razorpay Verified Merchant</span>
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
            256-bit Encrypted
          </span>
        </div>

      </div>
    </div>
  );
};
