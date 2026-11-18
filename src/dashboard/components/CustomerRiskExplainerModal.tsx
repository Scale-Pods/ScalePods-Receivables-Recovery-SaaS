import React from 'react';
import { 
  X, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  RefreshCw, 
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
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111218] shadow-2xl p-4 sm:p-5 text-zinc-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Horizontal Compact Bar */}
        <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                Customer Risk Score Engine
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                Autonomous Cadence Logic
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer"
            >
              Got it
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Column Horizontal Grid (No scroll needed) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          
          {/* Column 1: Historical Factors */}
          <div className="p-3 rounded-xl bg-purple-50/30 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider font-semibold text-purple-700 dark:text-purple-300 mb-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-500" />
                <span>1. Evaluated History</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 leading-tight">
                Calculated directly from customer repayment habits:
              </p>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex items-center justify-between p-1.5 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-3 h-3 text-zinc-400 shrink-0" /> Late payments
                  </span>
                  <span className="text-[10px] text-zinc-400">Count</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <Clock className="w-3 h-3 text-zinc-400 shrink-0" /> Avg days late
                  </span>
                  <span className="text-[10px] text-zinc-400">Velocity</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Promises record
                  </span>
                  <span className="text-[10px] text-zinc-400">Kept/Broken</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" /> Disputes record
                  </span>
                  <span className="text-[10px] text-zinc-400">Claims</span>
                </div>
                <div className="flex items-center justify-between p-1.5 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <SlidersHorizontal className="w-3 h-3 text-zinc-400 shrink-0" /> Part-payments
                  </span>
                  <span className="text-[10px] text-zinc-400">Installments</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Three Buckets & Cadences */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                <span>2. Three Buckets</span>
                <span className="text-[10px] text-zinc-400 font-normal">New = Standard</span>
              </div>
              <div className="space-y-1.5">
                {/* Reliable */}
                <div className="p-2 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-xs">Reliable</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">80–100</span>
                  </div>
                  <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 font-mono">→ Light Cadence</div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">Polite statements, longer reminder intervals.</p>
                </div>

                {/* Watch */}
                <div className="p-2 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-amber-700 dark:text-amber-400 text-xs">Watch</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">55–79</span>
                  </div>
                  <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 font-mono">→ Standard Cadence</div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">Default for new customers. Balanced schedule.</p>
                </div>

                {/* High Risk */}
                <div className="p-2 rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-500/5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-rose-700 dark:text-rose-400 text-xs">High Risk</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">&lt; 55</span>
                  </div>
                  <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 font-mono">→ Intensive Cadence</div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">Accelerated touches & Voice AI. 2+ overdue route here.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Owner Control & Real-time Updates */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                <span>3. Owner Control</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 leading-tight">
                Real-time updates with complete manual override:
              </p>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                  <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 text-[11px]">
                    <RefreshCw className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Updates After Every Payment</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                    Recalculates instantly when payments are marked or fetched from email.
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                  <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                    <span>Transparent &quot;See Why&quot;</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                    Click any score badge in the ledger to inspect the exact historical impact.
                  </p>
                </div>

                <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80">
                  <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 text-[11px]">
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Manual Override &amp; Lock</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-tight">
                    Move any customer to any cadence and lock it against algorithm changes.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
