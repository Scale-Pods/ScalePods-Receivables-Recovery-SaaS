import React from 'react';
import { comparisonData } from '../data/landingData';
import { Check, X, Minus, Sparkles } from 'lucide-react';

export const ComparisonTable: React.FC = () => {
  return (
    <section id="comparison" className="py-20 md:py-28 relative overflow-hidden bg-white dark:bg-[#07080D] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/25 bg-purple-500/10 text-xs font-mono text-purple-600 dark:text-purple-300">
            <span>Enterprise Benchmark</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Why Modern CFOs Choose Autonomous Recovery.
          </h2>

          <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
            Side-by-side matrix comparing Our Platform vs. Traditional Collection Agencies vs. Manual Excel follow-ups.
          </p>
        </div>

        {/* Comparison Table Container */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white/80 dark:bg-[#0B0C13]/90 shadow-xl dark:shadow-2xl overflow-hidden relative backdrop-blur-md">
          {/* Subtle glow accent */}
          <div className="absolute top-0 left-1/3 w-80 h-40 bg-purple-600/10 dark:bg-purple-500/15 blur-[90px] pointer-events-none" />

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[30%]" />
                <col className="w-[24%]" />
                <col className="w-[24%]" />
              </colgroup>

              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-[#0E0F18]">
                  <th className="py-5 px-6 font-mono text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                    Benchmark Metric
                  </th>

                  {/* Autonomous Engine - Highlighted Column Header */}
                  <th className="py-5 px-6 bg-purple-600/[0.08] dark:bg-purple-500/[0.12] border-x border-purple-500/25 dark:border-purple-500/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span className="font-bold text-sm sm:text-base text-purple-900 dark:text-purple-200">
                          Autonomous Engine
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold whitespace-nowrap">
                        Autonomous
                      </span>
                    </div>
                  </th>

                  {/* Traditional Agencies */}
                  <th className="py-5 px-6 font-semibold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                    <div className="flex flex-col">
                      <span>Traditional Collection Agencies</span>
                      <span className="text-[11px] font-normal text-zinc-400 mt-0.5">External Agency</span>
                    </div>
                  </th>

                  {/* Manual Excel Follow-ups */}
                  <th className="py-5 px-6 font-semibold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
                    <div className="flex flex-col">
                      <span>Manual Excel Follow-ups</span>
                      <span className="text-[11px] font-normal text-zinc-400 mt-0.5">Spreadsheets & Email</span>
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70 text-xs sm:text-sm">
                {comparisonData.map((row) => (
                  <tr 
                    key={row.criteria}
                    className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    {/* Metric Criteria */}
                    <td className="py-5 px-6 font-semibold text-zinc-900 dark:text-zinc-100 align-top">
                      {row.criteria}
                    </td>

                    {/* Autonomous Engine (Highlighted Body) */}
                    <td className="py-5 px-6 font-medium text-emerald-800 dark:text-emerald-300 bg-purple-600/[0.04] dark:bg-purple-500/[0.06] border-x border-purple-500/20 dark:border-purple-500/25 align-top">
                      <div className="flex items-start gap-2.5">
                        <span className="p-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <span className="leading-relaxed">{row.recovr}</span>
                      </div>
                    </td>

                    {/* Traditional Agency */}
                    <td className="py-5 px-6 text-zinc-600 dark:text-zinc-400 align-top">
                      <div className="flex items-start gap-2.5">
                        <span className="p-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-500 shrink-0 mt-0.5">
                          <X className="w-3.5 h-3.5" />
                        </span>
                        <span className="leading-relaxed">{row.traditionalAgency}</span>
                      </div>
                    </td>

                    {/* Manual Excel */}
                    <td className="py-5 px-6 text-zinc-600 dark:text-zinc-400 align-top">
                      <div className="flex items-start gap-2.5">
                        <span className="p-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                          <Minus className="w-3.5 h-3.5" />
                        </span>
                        <span className="leading-relaxed">{row.manualExcel}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
};
