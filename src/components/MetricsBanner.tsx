import React from 'react';
import { keyProofMetrics } from '../data/landingData';
import { TrendingUp, ShieldCheck, Zap, Users } from 'lucide-react';

export const MetricsBanner: React.FC = () => {
  const icons = [TrendingUp, Zap, ShieldCheck, Users];

  return (
    <section className="py-12 border-y border-zinc-800/80 bg-[#0A0B11]/70 backdrop-blur-md relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {keyProofMetrics.map((metric, idx) => {
            const Icon = icons[idx % icons.length];
            return (
              <div 
                key={metric.label}
                className="flex flex-col items-center text-center p-3 rounded-xl hover:bg-zinc-900/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 shadow-xs">
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight text-gradient">
                  {metric.value}
                </div>
                
                <div className="text-xs sm:text-sm font-semibold text-zinc-300 mt-1">
                  {metric.label}
                </div>
                
                <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                  {metric.detail}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
