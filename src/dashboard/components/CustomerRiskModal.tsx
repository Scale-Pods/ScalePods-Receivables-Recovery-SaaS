import React from 'react';
import { X, Activity } from 'lucide-react';

import { CustomerProfile } from '../types/dashboard';
import { CompanyAvatar } from './CompanyAvatar';

interface CustomerRiskModalProps {
  customer: CustomerProfile | null;
  onClose: () => void;
}

/** Read-only risk view: only risk_score and risk_reason are shown. */
export const CustomerRiskModal: React.FC<CustomerRiskModalProps> = ({
  customer,
  onClose,
}) => {
  if (!customer) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={customer.company} size="lg" />
            <div>
              <h3 className="font-semibold text-base text-zinc-900 dark:text-white">
                {customer.company}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Risk Profile
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
              <Activity className="w-3.5 h-3.5" />
              Risk Score
            </div>
            <div className="font-mono text-2xl font-bold text-zinc-900 dark:text-white">
              {customer.riskScore}
              <span className="ml-1 text-xs font-normal text-zinc-400">/ 100</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 p-4">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
              Risk Reason
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {customer.riskReason || customer.whyExplanation || 'No risk reason recorded.'}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerRiskModal;
