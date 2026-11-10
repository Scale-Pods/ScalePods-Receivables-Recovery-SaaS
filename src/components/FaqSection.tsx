import React, { useState } from 'react';
import { faqs } from '../data/landingData';
import { Plus, Minus } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-28 relative overflow-hidden bg-[#07080D] border-t border-zinc-800/40">
      
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-900/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Badge */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 text-xs font-mono text-purple-300">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
        </div>

        {/* Clean Hairline-Divided Accordion List */}
        <div className="divide-y divide-zinc-800/70 border-t border-b border-zinc-800/70">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="group transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full py-5 sm:py-6 flex items-start justify-between text-left gap-4 cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className={`font-semibold text-base sm:text-lg transition-colors leading-snug ${
                    isOpen ? 'text-purple-300' : 'text-zinc-200 group-hover:text-white'
                  }`}>
                    {faq.question}
                  </span>
                  
                  {/* Minimal Plus/Minus Indicator */}
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 ${
                    isOpen
                      ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 rotate-90'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 group-hover:border-zinc-700 group-hover:text-white'
                  }`}>
                    {isOpen ? (
                      <Minus className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </span>
                </button>

                {/* Smooth Collapsible Answer Container */}
                {isOpen && (
                  <div className="pb-6 pt-1 text-sm text-zinc-400 leading-relaxed font-sans pr-6 sm:pr-12 animate-in fade-in slide-in-from-top-1 duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
