import React from 'react';
import { testimonials } from '../data/landingData';
import { Star, Quote } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-[#08090E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/25 bg-purple-500/10 text-xs font-mono text-purple-300">
            <span>Verified Customer Stories</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Trusted by Finance Leaders Across India.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            See how mid-market CFOs, logistics giants, and enterprise SaaS companies eliminated overdue debt and improved cash runway.
          </p>
        </div>

        {/* Testimonials 3-Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7 max-w-6xl mx-auto">
          {testimonials.map((t, idx) => (
            <div
              key={t.name}
              className="glass-card glass-card-hover rounded-2xl p-7 border border-zinc-800/80 flex flex-col justify-between"
            >
              <div>
                {/* 5 Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Stat Highlight Pill */}
                <div className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  {t.statHighlight}
                </div>

                {/* Quote Text */}
                <p className="text-sm text-zinc-300 leading-relaxed italic mb-6">
                  "{t.quote}"
                </p>
              </div>

              {/* Author Info with circular avatar */}
              <div className="pt-4 border-t border-zinc-800/80 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 ${t.avatarBg}`}>
                  {t.avatarInitials}
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">
                    {t.name}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {t.role}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    {t.company}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
