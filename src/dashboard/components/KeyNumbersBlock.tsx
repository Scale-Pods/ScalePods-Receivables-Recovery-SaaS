import React from 'react';
import { Lock } from 'lucide-react';
import { KeyMetric, PlanTier } from '../types/dashboard';

interface KeyNumbersBlockProps {
  metrics: KeyMetric[];
  planTier: PlanTier;
  onUpgradePrompt: () => void;
}

const MinimalSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 64;
  const height = 22;
  const padding = 1;

  const points = data
    .map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const KeyNumbersBlock: React.FC<KeyNumbersBlockProps> = ({
  metrics,
  planTier,
  onUpgradePrompt,
}) => {
  const isFreePlan = planTier === 'free';

  const getMetricColor = (id: string, isGood: boolean) => {
    if (id === 'recovered_mtd' || id === 'collection_rate') return '#10B981'; // emerald
    if (id === 'open_disputes') return '#F43F5E'; // rose
    return '#71717A'; // calm neutral slate
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Key Numbers
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Portfolio liquidity and recovery touch metrics
          </p>
        </div>

        <div className="text-[11px] font-mono text-zinc-400">
          {isFreePlan ? 'Free: 3 metrics unlocked' : 'All 8 metrics unlocked'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((metric, idx) => {
          const isGated = isFreePlan && idx >= 3;
          const strokeColor = getMetricColor(metric.id, metric.isGoodDirection);

          if (isGated) {
            return (
              <div
                key={metric.id}
                onClick={onUpgradePrompt}
                className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-3.5 flex flex-col justify-between cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span className="truncate">{metric.title}</span>
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="text-lg font-bold font-mono text-zinc-300 dark:text-zinc-700 select-none">
                  ••••
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-2">
                  Basic & above
                </div>
              </div>
            );
          }

          return (
            <div
              key={metric.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3.5 flex flex-col justify-between shadow-card-light dark:shadow-card-dark"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  <span className="font-medium truncate">{metric.title}</span>
                  <span className={`text-[10px] font-mono font-medium ${
                    metric.isGoodDirection ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'
                  }`}>
                    {metric.changePct > 0 ? `+${metric.changePct}%` : `${metric.changePct}%`}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl sm:text-2xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                    {metric.value}
                  </span>
                  <MinimalSparkline
                    data={metric.sparkline}
                    color={strokeColor}
                  />
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {metric.subtext}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
