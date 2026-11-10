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
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D0E15] p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5 flex items-center justify-between">
              <span>Outstanding Balance</span>
              <IndianRupee className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono tabular-nums">
              {formatINR(totalOwed)}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-rose-600 dark:text-rose-400 font-semibold">Overdue: {formatINR(totalOverdue)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Recovered: {formatINR(totalRecovered)}</span>
          </div>
        </div>

        {/* Metric 2: Active Accounts */}
        <div 
          onClick={onViewChannels}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D0E15] p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all cursor-pointer shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold mb-1.5 flex items-center justify-between">
              <span>Active Outreach</span>
              <Users className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono tabular-nums">
              {activeWorkflowsCount} <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">Accounts</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            <span>Email • WhatsApp • Voice</span>
            <span className="text-zinc-800 dark:text-zinc-200 font-medium">{touchesTodayCount} touches</span>
          </div>
        </div>

        {/* Metric 3: Owner Attention */}
        <div 
          onClick={onScrollToFocus}
          className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/[0.04] p-5 hover:border-amber-500/60 transition-all cursor-pointer shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-500 font-semibold mb-1.5 flex items-center justify-between">
              <span>Owner Review</span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="text-3xl sm:text-4xl font-bold tracking-tight text-amber-700 dark:text-amber-500 font-mono tabular-nums">
              {pendingOwnerItemsCount} <span className="text-base font-normal text-amber-600 dark:text-amber-400/80">Pending</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-medium">
            <span>Disputes & Approvals</span>
            <span className="font-semibold flex items-center gap-1">
              <span>Action</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

      </div>
    </section>
  );
};
