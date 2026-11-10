import React from 'react';
import { ArrowRight } from 'lucide-react';
import { GlowingOrbitalHeroGraphic } from './GlowingOrbitalHeroGraphic';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-[#07080E] bg-grid-pattern">
      
      {/* Background atmospheric ambient glows */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[550px] h-[450px] bg-purple-600/25 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[250px] bg-purple-700/15 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 2-Column Hero: Left Typography & Actions, Right 3D Orbital Centerpiece */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Exact Headline Typography & Copy */}
          <div className="lg:col-span-6 space-y-7 text-left">

            {/* Bold 3-Line Headline matching reference image exactly */}
            <h1 className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight text-white leading-[1.06]">
              Recover before <br />
              <span className="text-gradient-purple">
                it becomes bad
              </span> <br />
              <span className="text-gradient-purple">
                debt.
              </span>
            </h1>

            {/* Crisp subtitle */}
            <p className="text-base sm:text-lg text-zinc-400 max-w-xl font-normal leading-relaxed">
              Autonomous receivables orchestration for modern B2B finance. 
              Calibrated 21-day automated workflows with instant UPI clearance and zero awkward calls.
            </p>

            {/* CTA Button and Secondary Link */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-[0_8px_32px_rgba(124,58,237,0.65)] hover:shadow-[0_10px_40px_rgba(124,58,237,0.85)] transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Get Early Access</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#engine"
                className="text-xs sm:text-sm font-mono text-zinc-400 hover:text-white transition-colors py-2 flex items-center gap-1.5 cursor-pointer"
              >
                <span>How 21D Engine works</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

          {/* Right Column: Exact 3D Glowing Token & Orbital Centerpiece from screenshot */}
          <div className="lg:col-span-6 flex items-center justify-center relative">
            <GlowingOrbitalHeroGraphic />
          </div>

        </div>

      </div>
    </section>
  );
};
