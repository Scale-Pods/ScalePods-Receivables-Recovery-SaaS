import React, { useState } from 'react';
import { Calculator, ArrowRight, IndianRupee, Sparkles, TrendingUp, Check } from 'lucide-react';

interface RoiCalculatorProps {
  onOpenDemoModal: () => void;
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ onOpenDemoModal }) => {
  // Amount in Lakhs (e.g. 50 Lakhs = 50)
  const [overdueLakhs, setOverdueLakhs] = useState<number>(75);
  const [currentDso, setCurrentDso] = useState<number>(60);

  // Calculations:
  // Overdue in Rupees = overdueLakhs * 100000
  const totalOverdueINR = overdueLakhs * 100000;
  
  // Typical recovery within 30 days via RECOVR = ~72%
  const estimatedRecoveredINR = Math.round(totalOverdueINR * 0.72);

  // Working capital interest saved at 12% annual on recovered cash over a 30-day turnaround
  // (Recovered * 0.12 * (currentDso - 6.2) / 365)
  const daysSaved = Math.max(10, currentDso - 6.2);
  const interestSavedINR = Math.round((estimatedRecoveredINR * 0.12 * daysSaved) / 365);

  // Hours saved (approx 12 hrs per 10 Lakhs overdue)
  const hoursSavedPerMonth = Math.round(overdueLakhs * 1.4);

  const formatINR = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} Lakhs`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <section id="roi" className="py-20 md:py-28 relative overflow-hidden bg-grid-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/25 bg-purple-500/10 text-xs font-mono text-purple-300">
            <Calculator className="w-3.5 h-3.5 text-purple-400" />
            <span>Interactive Working Capital Impact</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Calculate Your Recoverable Cash Flow.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            See exactly how much liquidity RECOVR unlocks in your first 30 days, and the interest saved on expensive bank credit lines.
          </p>
        </div>

        {/* Calculator Card Container */}
        <div className="max-w-5xl mx-auto glass-card rounded-2xl p-6 sm:p-10 border border-zinc-800 shadow-2xl">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Sliders */}
            <div className="lg:col-span-7 space-y-7">
              
              {/* Slider 1: Overdue Balance */}
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-sm font-semibold text-white">
                    Monthly Overdue Receivables
                  </label>
                  <span className="text-lg font-bold font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-lg">
                    {formatINR(totalOverdueINR)}
                  </span>
                </div>
                
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="5"
                  value={overdueLakhs}
                  onChange={(e) => setOverdueLakhs(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none"
                />
                
                <div className="flex justify-between text-[11px] font-mono text-zinc-500 mt-1.5">
                  <span>₹10 Lakhs</span>
                  <span>₹2.5 Crores</span>
                  <span>₹5.0 Crores</span>
                </div>
              </div>

              {/* Slider 2: Current DSO */}
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-sm font-semibold text-white">
                    Your Current Average DSO (Days Sales Outstanding)
                  </label>
                  <span className="text-lg font-bold font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">
                    {currentDso} Days
                  </span>
                </div>
                
                <input
                  type="range"
                  min="30"
                  max="120"
                  step="5"
                  value={currentDso}
                  onChange={(e) => setCurrentDso(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
                
                <div className="flex justify-between text-[11px] font-mono text-zinc-500 mt-1.5">
                  <span>30 Days (Fast)</span>
                  <span>60 Days (Avg)</span>
                  <span>120 Days (Delinquent)</span>
                </div>
              </div>

              {/* Assumptions Note */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400 font-mono leading-relaxed">
                💡 <span className="text-zinc-300 font-semibold">Model Benchmarks:</span> 72% typical recovery in 21 days based on 34,000+ Indian commercial invoices. Working capital interest benchmarked at 12.0% p.a.
              </div>

            </div>

            {/* Right Results Panel */}
            <div className="lg:col-span-5 bg-gradient-to-b from-purple-950/40 via-zinc-900/90 to-zinc-900/90 border border-purple-500/30 rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col justify-between space-y-6">
              
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-purple-300 font-semibold block mb-2">
                  Estimated 30-Day Recovery
                </span>
                
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white text-gradient">
                  {formatINR(estimatedRecoveredINR)}
                </div>
                <div className="text-xs text-emerald-400 font-mono mt-1 flex items-center gap-1">
                  <span>✓ Cash unlocked within 21-day engine cycle</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-800/80 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Working Capital Interest Saved:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{formatINR(interestSavedINR)} / cycle
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Credit Controller Hours Saved:</span>
                  <span className="font-mono font-bold text-white">
                    ~{hoursSavedPerMonth} hrs / mo
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Estimated Software Payback:</span>
                  <span className="font-mono font-bold text-purple-400">
                    &lt; 4 business days
                  </span>
                </div>
              </div>

              <button
                onClick={onOpenDemoModal}
                className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Unlock This Cash Flow Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
