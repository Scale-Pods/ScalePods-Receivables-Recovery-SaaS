import React from 'react';
import { 
  X, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
  ShieldCheck, 
  SlidersHorizontal 
} from 'lucide-react';

interface CustomerRiskExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerRiskExplainerModal: React.FC<CustomerRiskExplainerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden p-6 text-zinc-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700">
              <HelpCircle className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Customer risk score
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                How recovery risk tiers & cadences are calculated
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-4 text-xs">
          
          {/* Main Statement Quote / Highlight Box */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
            <div className="border-l-2 border-zinc-900 dark:border-white pl-3 space-y-1.5">
              <h4 className="font-mono text-xs uppercase tracking-wider font-semibold text-zinc-900 dark:text-white">
                Customer risk score
              </h4>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Built from their own history: late payments, average days late, promises kept or broken, disputes and part-payment habits.
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Three buckets. Reliable goes to Light, Watch to Standard, High risk to Intensive. A new customer starts at Standard.
              </p>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                Kept current, owner-controlled. Updates after every payment.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/80">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                <Clock className="w-3 h-3 text-zinc-400" /> Late payments
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                <Clock className="w-3 h-3 text-zinc-400" /> Avg days late
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Promises kept/broken
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> Disputes record
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-mono sm:col-span-2">
                <SlidersHorizontal className="w-3 h-3 text-zinc-400" /> Part-payment habits
              </span>
            </div>
          </div>

          {/* Three Buckets Explanation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono uppercase tracking-wider text-zinc-400 text-[11px] font-semibold">
                Three Buckets & Cadences
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                A new customer starts at Standard
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Reliable -> Light */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                    Reliable
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    80-100
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                  → Light Cadence
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                  Polite statements and longer reminder intervals.
                </p>
              </div>

              {/* Watch -> Standard */}
              <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-amber-700 dark:text-amber-400 font-mono">
                    Watch
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    55-79
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                  → Standard Cadence
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                  Default for new customers. Regular balanced follow-up.
                </p>
              </div>

              {/* High Risk -> Intensive */}
              <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-rose-700 dark:text-rose-400 font-mono">
                    High Risk
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
                    &lt; 55
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 font-mono">
                  → Intensive Cadence
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                  Accelerated schedule & AI voice calls. 2+ overdue invoices automatically route here.
                </p>
              </div>
            </div>
          </div>

          {/* Kept current, owner-controlled */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="font-semibold text-zinc-900 dark:text-white text-xs">
                Kept current, owner-controlled. Updates after every payment.
              </span>
            </div>
            <ul className="space-y-1.5 pl-6 list-disc text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <li>
                <strong>Automatic recalculation:</strong> As soon as a payment is marked paid or fetched from email, the customer&apos;s score updates in real-time.
              </li>
              <li>
                <strong>Transparent breakdown:</strong> Click on any customer&apos;s score in the ledger to see the full historical breakdown (&quot;See Why&quot;).
              </li>
              <li>
                <strong>Owner override &amp; lock:</strong> The owner can manually move any customer to another bucket and lock the choice so future automatic updates will not override it.
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};
