import React from 'react';
import { Users, IndianRupee, ArrowUpRight } from 'lucide-react';
import { formatINR } from '../utils/formatters';

interface ThreeQuestionsBarProps {
  totalOwed: number;
  totalOverdue: number;
  totalRecovered: number;
  activeWorkflowsCount: number;
  touchesTodayCount: number;
  pendingOwnerItemsCount: number;
  onViewLedger: () => void;
  onViewChannels: () => void;
  onScrollToFocus: () => void;
}

export const ThreeQuestionsBar: React.FC<ThreeQuestionsBarProps> = ({
  totalOwed,
  totalOverdue,
  totalRecovered,
  activeWorkflowsCount,
  touchesTodayCount,
  pendingOwnerItemsCount,
  onViewLedger,
  onViewChannels,
  onScrollToFocus,
}) => {
  return (
    <section className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Metric 1: Total Outstanding */}
        <div 
          onClick={onViewLedger}
          className="group rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-gradient-to-b from-white via-white to-slate-50/50 dark:from-[#0D0E15] dark:to-[#0D0E15] p-5 hover:border-purple-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.03)] dark:shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5 flex items-center justify-between">
              <span>Outstanding Balance</span>
              <div className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                <IndianRupee className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono tabular-nums">
              {formatINR(totalOwed)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Overdue */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Overdue</span>
              <span className="font-mono font-bold text-[11px] text-zinc-900 dark:text-zinc-100 tabular-nums">
                {formatINR(totalOverdue)}
              </span>
            </div>

            {/* Recovered */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Recovered</span>
              <span className="font-mono font-bold text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatINR(totalRecovered)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Active Accounts */}
        <div 
          onClick={onViewChannels}
          className="group rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-gradient-to-b from-white via-white to-slate-50/50 dark:from-[#0D0E15] dark:to-[#0D0E15] p-5 hover:border-indigo-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.03)] dark:shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5 flex items-center justify-between">
              <span>Active Outreach</span>
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono tabular-nums">
              {activeWorkflowsCount} <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">{activeWorkflowsCount === 1 ? 'Account' : 'Accounts'}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Email • WhatsApp • Voice</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold border border-zinc-200/70 dark:border-zinc-700/70">
              {touchesTodayCount} touches
            </span>
          </div>
        </div>

        {/* Metric 3: Owner Attention */}
        <div 
          onClick={onScrollToFocus}
          className="group rounded-2xl border border-amber-300/80 dark:border-amber-500/30 bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-amber-50/20 dark:from-amber-500/[0.04] dark:to-transparent p-5 hover:border-amber-400 transition-all cursor-pointer shadow-[0_1px_3px_rgba(245,158,11,0.08),0_8px_20px_rgba(245,158,11,0.04)] dark:shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-800 dark:text-amber-500 font-semibold mb-1.5 flex items-center justify-between">
              <span>Owner Review</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-amber-800 dark:text-amber-500 font-mono tabular-nums">
              {pendingOwnerItemsCount} <span className="text-base font-normal text-amber-700 dark:text-amber-400/80">Pending</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/80 dark:border-amber-500/20 flex items-center justify-between text-xs text-amber-800 dark:text-amber-400 font-medium">
            <span>Disputes & Approvals</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950/60 font-semibold flex items-center gap-1 border border-amber-300/60 dark:border-amber-800/60">
              <span>Action</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
