import React, { useEffect, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import {
  Invoice,
  PAYMENT_TYPE_OPTIONS,
  PaymentType,
} from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface MarkPaidModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onConfirmMarkPaid: (invoice: Invoice, paymentType: PaymentType, note: string) => void;
}

export const MarkPaidModal: React.FC<MarkPaidModalProps> = ({
  invoice,
  onClose,
  onConfirmMarkPaid,
}) => {
  const [paymentType, setPaymentType] = useState<PaymentType>('NEFT');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (invoice) {
      setPaymentType('NEFT');
      setNote('');
    }
  }, [invoice?.id]);

  if (!invoice) return null;

  const selectedOption =
    PAYMENT_TYPE_OPTIONS.find((option) => option.value === paymentType) ?? PAYMENT_TYPE_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden p-5">

        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              Record Payment
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
          Confirm settlement for{' '}
          <strong className="text-zinc-900 dark:text-white">#{invoice.invoiceNumber}</strong>{' '}
          ({invoice.customerCompany}) of{' '}
          <strong className="text-zinc-900 dark:text-white">{formatINR(invoice.amount)}</strong>.
          The invoice will leave its ageing bucket.
        </p>

        <div className="space-y-4 mb-5 text-xs">
          <div>
            <label
              htmlFor="mark-paid-payment-type"
              className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Payment type
            </label>
            <select
              id="mark-paid-payment-type"
              aria-label="Payment type"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentType)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 cursor-pointer"
            >
              {PAYMENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.description}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Saved to recovery_outreach “Type”
            </p>
          </div>

          <div>
            <label
              htmlFor="mark-paid-note"
              className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Payment note <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="mark-paid-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. UTR 512345678901, HDFC Bank, credited on 24 Nov"
              className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            <p className="mt-1 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Saved to recovery_outreach “Note”
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold">
              Selected mode
            </div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-white mt-0.5">
              {selectedOption.label}
            </div>
            <div className="text-[11px] text-zinc-600 dark:text-zinc-300">
              {selectedOption.description}
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
            onClick={() => onConfirmMarkPaid(invoice, paymentType, note.trim())}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm Payment</span>
          </button>
        </div>

      </div>
    </div>
  );
};
