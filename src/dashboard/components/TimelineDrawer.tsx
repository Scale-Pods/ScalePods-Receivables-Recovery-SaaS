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
  PlanTier,
  OutreachFlow
} from '../types/dashboard';
import { formatINR } from '../utils/formatters';
import { CompanyAvatar } from './CompanyAvatar';
import { InvoiceOutreachFlow } from './InvoiceOutreachFlow';
import { readStoredSequence } from '../../lib/invoiceWorkflow';
import { buildRecoverySchedulePreview, defaultRecoverySequence } from '../../lib/recoverySchedule';
import WhatsAppLogo from '../../components/WhatsAppLogo';

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
  const isFreePlan = planTier === 'free';
  const isPaid = invoice?.status === 'paid' || invoice?.currentStage === 'Done';

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'invoice_due':
        return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
      case 'bucket_move':
        return <Clock className="w-3.5 h-3.5 text-zinc-400" />;
      case 'email_sent':
        return <Mail className="w-3.5 h-3.5 text-zinc-400" />;
      case 'whatsapp_sent':
        return <WhatsAppLogo className="w-3.5 h-3.5" />;
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

  const formatTimelineTimestamp = (raw: string) => {
    if (!raw) return '';
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return raw;
    if (raw.length <= 10) {
      return new Intl.DateTimeFormat('en-IN', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }).format(parsed);
    }
    return new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

  const sortedTimeline = React.useMemo(() => {
    if (!invoice?.timeline) return [];
    return [...invoice.timeline].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      if (isNaN(timeA) || isNaN(timeB)) return 0;
      return timeA - timeB;
    });
  }, [invoice?.timeline]);

  // Prefer the cadence generated for this specific invoice. Older rows fall
  // back to the locally saved/default sequence so the flow is never empty.
  const outreachFlow = React.useMemo<OutreachFlow | null>(() => {
    if (invoice?.outreachSequence?.steps?.length) return invoice.outreachSequence;
    if (!invoice) return null;

    const stored = typeof window !== 'undefined' ? readStoredSequence() : null;
    const preview = buildRecoverySchedulePreview(
      stored?.sequence || defaultRecoverySequence,
      invoice.dueDate,
    );

    return {
      source: stored ? 'local' : 'default',
      ...(stored?.totalDays ? { totalDays: stored.totalDays } : {}),
      steps: preview.steps.map((step) => ({
        ...step,
        scheduledDate: step.scheduled_date,
      })),
    };
  }, [invoice]);

  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
      
      {/* Drawer */}
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#101014] border-l border-slate-200 dark:border-zinc-800 shadow-2xl h-full flex flex-col z-10 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-[#101014]">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={invoice.customerCompany} logoUrl={invoice.avatarUrl} size="lg" />
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
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
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
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Sequence column: stays on the left of the invoice details on desktop. */}
            {outreachFlow && (
              <aside className="max-h-[45vh] w-full shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 lg:max-h-none lg:w-[340px] lg:border-b-0 lg:border-r">
                <InvoiceOutreachFlow flow={outreachFlow} invoice={invoice} />
              </aside>
            )}

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 text-xs">
            {/* Overview Card */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/40 p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-mono uppercase font-semibold text-zinc-500 dark:text-zinc-400">Amount Due</span>
                <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white tabular-nums">
                  {formatINR(invoice.amount)}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Due {invoice.dueDate} • <strong className="text-rose-600 dark:text-rose-400 font-semibold">{invoice.daysOverdue} days overdue</strong>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono uppercase font-semibold text-zinc-500 dark:text-zinc-400">Current Bucket</span>
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
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2 font-semibold">
                Owner Controls
              </span>
              <div className="flex flex-wrap gap-1.5">
                {!isPaid && (
                  <button
                    onClick={() => onMarkPaid(invoice)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Paid (Leaves Bucket)</span>
                  </button>
                )}

                {invoice.hasProofFile ? (
                  <button
                    type="button"
                    onClick={() => onViewProof(invoice)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Inspect attached bank UTR remittance slip"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Inspect Bank UTR / Receipt</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-slate-100/80 dark:bg-zinc-900/50 text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 cursor-not-allowed opacity-75"
                    title="No bank UTR or remittance receipt attached to this invoice yet"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span>Inspect Bank UTR / Receipt</span>
                  </button>
                )}

                {invoice.settlementOffer && invoice.settlementOffer.status === 'pending_owner' && onApproveSettlement ? (
                  <button
                    type="button"
                    onClick={() => onApproveSettlement(invoice)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title={`Approve discounted settlement offer: ${formatINR(invoice.settlementOffer.discountedAmount)}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Settlement ({formatINR(invoice.settlementOffer.discountedAmount)})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 bg-slate-100/80 dark:bg-zinc-900/50 text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 cursor-not-allowed opacity-75"
                    title="No discounted settlement offer pending on this invoice"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span>Approve Settlement</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onResendNotice(invoice)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Resend Notice</span>
                </button>

                <button
                  type="button"
                  onClick={() => onPauseResume(invoice)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                  type="button"
                  onClick={() => onChangeBucket(invoice)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Move</span>
                </button>
              </div>
            </div>

            {/* Risk Profile: score + reason only, shown directly in the card. */}
            <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/40 p-4 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                  Risk Profile
                </span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl font-bold text-zinc-900 dark:text-white">
                    {invoice.riskScore}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">/ 100</span>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
                {invoice.riskReason || customer?.riskReason || 'No risk reason recorded.'}
              </p>
            </div>

            {/* Proof Slip Preview Card */}
            {invoice.hasProofFile && invoice.proofFile && (
              <div className="rounded-xl border border-emerald-200/80 dark:border-zinc-800 bg-emerald-50/40 dark:bg-zinc-900/40 p-4 shadow-xs">
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>View Proof</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Audit Timeline */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-3 font-semibold">
                Audit Timeline & System Actions
              </span>

              <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200 dark:before:bg-zinc-800">
                {sortedTimeline.map((evt) => (
                  <div key={evt.id} className="relative">
                    <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-slate-100 dark:bg-zinc-800 border-2 border-purple-500 dark:border-purple-400" />

                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        {getTimelineIcon(evt.type)}
                        <span>{evt.title}</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-medium">
                        {formatTimelineTimestamp(evt.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {evt.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-[#101014]">
          <span className="font-mono">Autonomous Engine</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
