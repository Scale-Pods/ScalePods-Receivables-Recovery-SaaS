import React from 'react';
import { X, Check } from 'lucide-react';
import { Invoice, ProofFile } from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface ProofModalProps {
  invoice: Invoice | null;
  proof: ProofFile | null;
  onClose: () => void;
  onConfirmVerification: (invoice: Invoice) => void;
}

export const ProofModal: React.FC<ProofModalProps> = ({
  invoice,
  proof,
  onClose,
  onConfirmVerification,
}) => {
  if (!invoice || !proof) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-white">
              Bank NEFT / RTGS Remittance Advice
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Attached to #{invoice.invoiceNumber} • {invoice.customerCompany}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bank Advice Document */}
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-zinc-900 dark:text-white">HDFC BANK • CORPORATE RTGS / NEFT</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                UTR PROCESSED
              </span>
            </div>

            <div className="space-y-2 text-[11px] text-zinc-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-400">UTR / Reference:</span>
                <span className="font-semibold font-mono text-zinc-900 dark:text-white">{proof.bankReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Timestamp:</span>
                <span>{proof.uploadDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Remitter:</span>
                <span>{proof.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Beneficiary:</span>
                <span>Vivarily Technologies Pvt Ltd</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Invoice Ref:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{invoice.invoiceNumber}</span>
              </div>

              <div className="pt-2.5 mt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-baseline justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Total Cleared:</span>
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatINR(proof.amountReported)} INR
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Confirming will verify receipt of funds, mark the invoice <strong>Received / Done</strong>, remove it from the ageing bucket, and update customer reliability metrics.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmVerification(invoice)}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Verify & Mark Paid ({formatINR(proof.amountReported)})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
