import React from 'react';
import { 
  Check, 
  Lock, 
  ArrowRight
} from 'lucide-react';
import { FocusItem, PlanTier } from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface TodaysFocusBlockProps {
  items: FocusItem[];
  planTier: PlanTier;
  onActionClick: (item: FocusItem, actionKey: string) => void;
  onUpgradePrompt: () => void;
  onViewDetails: (item: FocusItem) => void;
}

export const TodaysFocusBlock: React.FC<TodaysFocusBlockProps> = ({
  items,
  planTier,
  onActionClick,
  onUpgradePrompt,
  onViewDetails,
}) => {
  const isLocked = planTier === 'free' || planTier === 'basic';

  const getBadgeStyle = (variant: FocusItem['badgeVariant']) => {
    switch (variant) {
      case 'amber':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'rose':
        return 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'emerald':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'purple':
      default:
        return 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';
    }
  };

  return (
    <section id="todays-focus" className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <span>Today's Focus</span>
          <span className="text-xs font-mono font-normal text-zinc-400">
            ({items.length})
          </span>
        </h2>
      </div>

      <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 shadow-card-light dark:shadow-card-dark overflow-hidden">
        
        {/* Tier Lock State */}
        {isLocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/70 dark:bg-black/80 backdrop-blur-sm p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center mb-2.5">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Today's Focus is included in Growth & Enterprise
            </h3>
            <p className="text-xs text-zinc-300 max-w-sm mb-3">
              One-tap clearance stream for payment approvals, dispute holds, and broken promise escalations.
            </p>
            <button
              onClick={onUpgradePrompt}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
            >
              <span>Preview Growth Tier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 dark:text-zinc-400 text-xs">
            <Check className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
            <p className="font-medium text-zinc-900 dark:text-white">All caught up</p>
            <p className="mt-0.5">No pending owner approvals or escalations right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {items.map((item) => (
              <div
                key={item.id}
                className="py-3.5 first:pt-1 last:pb-1 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Left Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getBadgeStyle(item.badgeVariant)}`}>
                      {item.badgeText}
                    </span>
                    <span className="text-xs font-semibold font-mono text-zinc-900 dark:text-white">
                      {formatINR(item.amount)}
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate">
                      {item.customerName} ({item.company})
                    </span>
                    <span className="text-zinc-400 font-mono text-[10px] hidden sm:inline">
                      • {item.invoiceId}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-normal leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.actionSecondary && (
                    <button
                      onClick={() => onActionClick(item, item.actionSecondary!.actionKey)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {item.actionSecondary.label}
                    </button>
                  )}

                  <button
                    onClick={() => onActionClick(item, item.actionPrimary.actionKey)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                  >
                    {item.actionPrimary.label}
                  </button>

                  <button
                    onClick={() => onViewDetails(item)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    title="View details"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
