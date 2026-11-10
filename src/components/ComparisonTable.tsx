import React from 'react';
import { comparisonData } from '../data/landingData';
import { Check, X, Minus, Sparkles } from 'lucide-react';

export const ComparisonTable: React.FC = () => {
  return (
    <section id="comparison" className="py-20 md:py-28 relative overflow-hidden bg-[#07080D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/25 bg-purple-500/10 text-xs font-mono text-purple-300">
            <span>Enterprise Benchmark</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Why Modern CFOs Choose Autonomous Recovery.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Side-by-side matrix comparing Our Platform vs. Traditional Collection Agencies vs. Manual Excel follow-ups.
          </p>
        </div>

        {/* Comparison Table Container */}
        <div className="max-w-5xl mx-auto glass-card rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-1/4 w-72 h-44 bg-purple-600/10 blur-[80px] pointer-events-none" />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              
              <thead>
                <tr className="border-b border-zinc-800 bg-[#0B0C13]">
                  <th className="py-5 px-6 font-semibold text-xs sm:text-sm text-zinc-400 w-1/4 font-mono uppercase tracking-wider">
                    Benchmark Metrics
                  </th>
                  <th className="py-5 px-6 font-bold text-sm sm:text-base text-purple-400 bg-purple-600/10 border-x border-purple-500/20 w-1/3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>Autonomous Engine</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
                        Autonomous
                      </span>
                    </div>
                  </th>
                  <th className="py-5 px-6 font-semibold text-xs sm:text-sm text-zinc-400 w-1/4">
                    Traditional Collection Agencies
                  </th>
                  <th className="py-5 px-6 font-semibold text-xs sm:text-sm text-zinc-400 w-1/4">
                    Manual Excel Follow-ups
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/80 text-xs sm:text-sm">
                {comparisonData.map((row, idx) => (
                  <tr 
                    key={row.criteria}
                    className="hover:bg-zinc-900/40 transition-colors"
                  >
                    {/* Metric Criteria */}
                    <td className="py-4.5 px-6 font-semibold text-white">
                      {row.criteria}
                    </td>

                    {/* Autonomous Engine (Highlighted) */}
                    <td className="py-4.5 px-6 font-semibold text-emerald-400 bg-purple-600/5 border-x border-purple-500/20">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{row.recovr}</span>
                      </div>
                    </td>

                    {/* Traditional Agency */}
                    <td className="py-4.5 px-6 text-zinc-400">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{row.traditionalAgency}</span>
                      </div>
                    </td>

                    {/* Manual Excel */}
                    <td className="py-4.5 px-6 text-zinc-400">
                      <div className="flex items-start gap-2">
                        <Minus className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{row.manualExcel}</span>
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
