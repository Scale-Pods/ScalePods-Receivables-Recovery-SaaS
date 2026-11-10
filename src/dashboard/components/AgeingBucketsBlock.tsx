import React from 'react';
import { Users, X } from 'lucide-react';
import { AgeingBucketStats, AgeingBucketId } from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface AgeingBucketsBlockProps {
  buckets: AgeingBucketStats[];
  selectedBucket: AgeingBucketId;
  onSelectBucket: (bucketId: AgeingBucketId) => void;
  totalReceivables: number;
}

export const AgeingBucketsBlock: React.FC<AgeingBucketsBlockProps> = ({
  buckets,
  selectedBucket,
  onSelectBucket,
  totalReceivables,
}) => {
  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Ageing Buckets
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Click any bucket to filter the ledger.
          </p>
        </div>

        {selectedBucket !== 'all' && (
          <button
            onClick={() => onSelectBucket('all')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 transition-colors"
          >
            <span>Clear Filter ({selectedBucket.toUpperCase()})</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Clean Stacked Bar */}
      <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex mb-3">
        {buckets.map((b) => {
          const widthPct = totalReceivables > 0 ? (b.amount / totalReceivables) * 100 : 25;
          const bgClass =
            b.id === 'early'
              ? 'bg-emerald-500'
              : b.id === '15+'
              ? 'bg-amber-500'
              : b.id === '30+'
              ? 'bg-zinc-400 dark:bg-zinc-500'
              : 'bg-rose-500';
          return (
            <div
              key={b.id}
              style={{ width: `${widthPct}%` }}
              className={`${bgClass} h-full cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => onSelectBucket(b.id)}
              title={`${b.name} (${b.daysOverdueLabel}): ${formatINR(b.amount)}`}
            />
          );
        })}
      </div>

      {/* 4 Clean Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {buckets.map((bucket) => {
          const isSelected = selectedBucket === bucket.id;

          return (
            <div
              key={bucket.id}
              onClick={() => onSelectBucket(isSelected ? 'all' : bucket.id)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/80 shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-card-light dark:shadow-card-dark'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-900 dark:text-white font-mono">
                  {bucket.name}
                </span>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  {bucket.daysOverdueLabel}
                </span>
              </div>

              <div className="text-xl sm:text-2xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums my-1">
                {formatINR(bucket.amount)}
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{bucket.customerCount} customers</span>
                </div>
                <span className="text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300">
                  {bucket.tone}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
