import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  AlertTriangle, 
  MessageSquare, 
  PhoneCall, 
  Mail, 
  Send, 
  PauseCircle, 
  PlayCircle, 
  Lock,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';
import { 
  Invoice, 
  CustomerProfile, 
  PlanTier 
} from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface TimelineDrawerProps {
  invoice: Invoice | null;
  customer: CustomerProfile | null;
  planTier: PlanTier;
  onClose: () => void;
  onMarkPaid: (invoice: Invoice) => void;
  onViewProof: (invoice: Invoice) => void;
  onPauseResume: (invoice: Invoice) => void;
  onResendNotice: (invoice: Invoice) => void;
  onChangeBucket: (invoice: Invoice) => void;
  onAnswerTicket: (invoice: Invoice) => void;
  onInspectRisk: (customer: CustomerProfile) => void;
  onApproveSettlement?: (invoice: Invoice) => void;
}

export const TimelineDrawer: React.FC<TimelineDrawerProps> = ({
  invoice,
  customer,
  planTier,
  onClose,
  onMarkPaid,
  onViewProof,
  onPauseResume,
  onResendNotice,
  onChangeBucket,
  onAnswerTicket,
  onInspectRisk,
  onApproveSettlement,
}) => {
  if (!invoice) return null;

  const isFreePlan = planTier === 'free';
  const isPaid = invoice.status === 'paid' || invoice.currentStage === 'Done';

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'invoice_due':
        return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
      case 'bucket_move':
        return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
      case 'email_sent':
        return <Mail className="w-3.5 h-3.5 text-zinc-400" />;
      case 'whatsapp_sent':
      case 'customer_reply':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'voice_call':
        return <PhoneCall className="w-3.5 h-3.5 text-zinc-400" />;
      case 'proof_uploaded':
        return <FileCheck className="w-3.5 h-3.5 text-emerald-500" />;
      case 'payment_verified':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'dispute_opened':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <Send className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
      
      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-white dark:bg-[#101014] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl h-full flex flex-col z-10 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-zinc-900 dark:text-white">
                {invoice.customerCompany}
              </h3>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {invoice.invoiceNumber}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Contact: {invoice.customerName} ({invoice.customerEmail})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Free Plan Lock */}
        {isFreePlan ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center mb-3">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
              Customer Profiles & Audit Timelines are included in Basic & above
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
              Switch plan to Basic, Growth, or Enterprise in the top header to inspect full timeline history and wire files.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            
            {/* Overview Card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-zinc-400">Amount Due</span>
                <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white tabular-nums">
                  {formatINR(invoice.amount)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Due {invoice.dueDate} • <strong className="text-rose-600 dark:text-rose-400 font-semibold">{invoice.daysOverdue} days overdue</strong>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono uppercase text-zinc-400">Current Bucket</span>
                <div className="text-xs font-bold font-mono text-zinc-900 dark:text-white">
                  {invoice.bucket.toUpperCase()}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {invoice.bucketTone}
                </div>
              </div>
            </div>

            {/* Owner Actions */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-2 font-semibold">
                Owner Controls
              </span>
              <div className="flex flex-wrap gap-1.5">
                {!isPaid && (
                  <button
                    onClick={() => onMarkPaid(invoice)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Paid (Leaves Bucket)</span>
                  </button>
                )}

                {invoice.hasProofFile && (
                  <button
                    onClick={() => onViewProof(invoice)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Inspect Bank UTR / Receipt</span>
                  </button>
                )}

                <button
                  onClick={() => onResendNotice(invoice)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Resend Notice</span>
                </button>

                <button
                  onClick={() => onPauseResume(invoice)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
                >
                  {invoice.status === 'paused' ? (
                    <>
                      <PlayCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Resume Cadence</span>
                    </>
                  ) : (
                    <>
                      <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pause Outreach</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onChangeBucket(invoice)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Move</span>
                </button>

                {customer && (
                  <button
                    onClick={() => onInspectRisk(customer)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Risk Profile</span>
                  </button>
                )}

                {invoice.settlementOffer && invoice.settlementOffer.status === 'pending_owner' && onApproveSettlement && (
                  <button
                    onClick={() => onApproveSettlement(invoice)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 flex items-center gap-1.5"
                  >
                    <span>Approve</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customer Risk & Historical Reliability */}
            {customer && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                    Customer Risk & Cadence Profile
                  </span>

                  <button
                    onClick={() => onInspectRisk(customer)}
                    className="text-xs text-zinc-900 dark:text-white font-medium hover:underline"
                  >
                    Edit / Lock →
                  </button>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
                      {customer.riskTier.toUpperCase()} • {customer.cadence.toUpperCase()} CADENCE
                    </span>
                    {customer.isLockedByOwner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-500">
                        <Lock className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </div>

                  <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                    {customer.riskScore}/100
                  </span>
                </div>

                <p className="text-zinc-600 dark:text-zinc-300 text-xs italic mb-2.5">
                  "{customer.whyExplanation}"
                </p>

                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] text-zinc-500 font-mono">
                  <div className="p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div>Late Count</div>
                    <div className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">{customer.historyFactors.latePaymentsCount}</div>
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div>Avg Days Late</div>
                    <div className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">{customer.historyFactors.avgDaysLate}d</div>
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div>Promises Kept</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{customer.historyFactors.promisesKept}</div>
                  </div>
                  <div className="p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div>Broken</div>
                    <div className="font-bold text-rose-600 dark:text-rose-400 text-xs">{customer.historyFactors.promisesBroken}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Proof Slip Preview Card */}
            {invoice.hasProofFile && invoice.proofFile && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-zinc-900 dark:text-white text-xs">
                      Bank UTR Slip Attached
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                    {invoice.proofFile.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-zinc-500 text-xs font-mono mb-2">
                  Ref: {invoice.proofFile.bankReference} • {formatINR(invoice.proofFile.amountReported)} INR
                </div>

                <button
                  onClick={() => onViewProof(invoice)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5"
                >
                  <span>View Proof</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Audit Timeline */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-3 font-semibold">
                Audit Timeline & System Actions
              </span>

              <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-200 dark:before:bg-zinc-800">
                {invoice.timeline.map((evt) => (
                  <div key={evt.id} className="relative">
                    <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-[#101014]" />

                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        {getTimelineIcon(evt.type)}
                        <span>{evt.title}</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {evt.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {evt.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono">RECOVR Engine</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
