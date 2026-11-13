import React, { useState } from 'react';
import { 
  X, 
  PauseCircle, 
  Clock, 
  MessageSquare, 
  Check, 
  Send
} from 'lucide-react';
import { Invoice } from '../types/dashboard';

interface PauseModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onConfirmPause: (invoice: Invoice, reason: string, duration: string) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  invoice,
  onClose,
  onConfirmPause,
}) => {
  const [reason, setReason] = useState('Client negotiated temporary payment extension');
  const [duration, setDuration] = useState('7 days');

  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden p-5">
        
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              Pause Autonomous Outreach
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
          Pausing will temporarily suppress automated WhatsApp messages, AI voice follow-ups, and email dunning for <strong className="text-zinc-900 dark:text-white">{invoice.customerCompany}</strong>.
        </p>

        <div className="space-y-3 mb-5 text-xs">
          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Reason for pause:
            </label>
            <select
              aria-label="Reason for pause"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
            >
              <option value="Client negotiated temporary payment extension">Client negotiated payment extension</option>
              <option value="Investigating milestone delivery dispute">Investigating milestone dispute</option>
              <option value="Awaiting executive approval on new PO">Awaiting approval on new PO</option>
              <option value="Holiday / corporate banking freeze">Holiday / corporate banking freeze</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Pause duration:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['3 days', '7 days', '14 days'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-xl border text-center font-mono font-medium transition-colors cursor-pointer ${
                    duration === d
                      ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmPause(invoice, reason, duration)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>
        </div>

      </div>
    </div>
  );
};

interface ChangeBucketModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onConfirmChangeBucket: (invoice: Invoice, newBucket: Invoice['bucket']) => void;
}

export const ChangeBucketModal: React.FC<ChangeBucketModalProps> = ({
  invoice,
  onClose,
  onConfirmChangeBucket,
}) => {
  const [newBucket, setNewBucket] = useState<Invoice['bucket']>(invoice?.bucket || '30+');

  if (!invoice) return null;

  const bucketOptions: { id: Invoice['bucket']; label: string; range: string; tone: string }[] = [
    { id: 'early', label: 'Early', range: '0–14 days overdue', tone: 'Friendly & Consultative tone' },
    { id: '15+', label: '15+', range: '15–29 days overdue', tone: 'Clear & Firm payment schedule' },
    { id: '30+', label: '30+', range: '30–59 days overdue', tone: 'Urgent CFO Escalation & Voice AI' },
    { id: '60+', label: '60+', range: '60 or more days overdue', tone: 'Executive Review / Human Escalation' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden p-5">
        
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              Move Ageing Bucket
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
          Move <strong className="text-zinc-900 dark:text-white">#{invoice.invoiceNumber}</strong> ({invoice.customerCompany}). The bucket sets the starting day and outreach tone. Leaves automatically when paid.
        </p>

        <div className="space-y-2 mb-5">
          {bucketOptions.map((b) => (
            <div
              key={b.id}
              onClick={() => setNewBucket(b.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-center justify-between ${
                newBucket === b.id
                  ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800/80 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-zinc-900 dark:text-white">{b.label}</span>
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">({b.range})</span>
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Tone: {b.tone}
                </div>
              </div>
              {newBucket === b.id && <Check className="w-4 h-4 text-zinc-900 dark:text-white" />}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmChangeBucket(invoice, newBucket)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>

      </div>
    </div>
  );
};

interface AnswerTicketModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onConfirmSendReply: (invoice: Invoice, replyText: string) => void;
}

export const AnswerTicketModal: React.FC<AnswerTicketModalProps> = ({
  invoice,
  onClose,
  onConfirmSendReply,
}) => {
  const [replyText, setReplyText] = useState(
    'Hi Priya, thanks for providing PO-99214. We have attached the updated GST invoice PDF with the purchase order referenced. Looking forward to the RTGS release today.'
  );

  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden p-5">
        
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              Answer Customer Inquiry Ticket
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Ticket Context */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 mb-4">
          <div className="font-bold text-zinc-900 dark:text-white font-mono mb-1">
            Ticket from {invoice.customerName} ({invoice.customerCompany}):
          </div>
          <p className="italic text-zinc-600 dark:text-zinc-300">
            "{invoice.ticketQuery || 'Please update the invoice with PO #PO-99214 so our ERP system can disburse the automated payment.'}"
          </p>
        </div>

        <div className="mb-4">
          <label className="block font-medium text-zinc-700 dark:text-zinc-300 text-xs mb-1">
            AI-Drafted 1-Tap Response:
          </label>
          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmSendReply(invoice, replyText)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Reply</span>
          </button>
        </div>

      </div>
    </div>
  );
};
