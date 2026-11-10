import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

interface CtaSectionProps {
  onGetStarted: () => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-grid-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="relative rounded-3xl p-8 sm:p-14 lg:p-16 overflow-hidden border border-purple-500/30 bg-gradient-to-r from-purple-950/60 via-[#0E0F1A] to-indigo-950/60 shadow-2xl shadow-purple-950/50">
          
          {/* Ambient lighting orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-purple-600/20 blur-[100px] pointer-events-none rounded-full" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-500/30 bg-purple-500/15 text-xs font-mono text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Zero Risk • Immediate Turnaround</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Reclaim Your Locked Cash Flow in Under 21 Days.
            </h2>

            <p className="text-zinc-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Connect your accounting software in 10 minutes. Let RECOVR's courteous AI handle the follow-ups while your finance team focuses on high-impact growth.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-xl shadow-purple-600/35 transition-all cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#pricing"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-zinc-300 hover:text-white border border-zinc-700 bg-zinc-900/80 backdrop-blur-md transition-colors cursor-pointer text-center"
              >
                Explore Pricing & Tiers
              </a>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                No Credit Card Required
              </span>
              <span>•</span>
              <span>Cancel Anytime</span>
              <span>•</span>
              <span>Enterprise SOC-2 Security</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
