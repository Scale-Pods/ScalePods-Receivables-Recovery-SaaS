import React from 'react';
import { 
  IngestionWireframeIcon, 
  ScoringWireframeIcon, 
  DispatchWireframeIcon, 
  SettlementWireframeIcon 
} from './IsometricStepIcons';

export const ArchitectureSection: React.FC = () => {
  const steps = [
    {
      title: 'Continuous ingestion',
      description: 'Real-time synchronization with modern ERPs, Zoho Books, SAP, and custom ledgers the exact second an invoice is generated.',
      icon: <IngestionWireframeIcon />,
      tag: '01 // ERP SYNC'
    },
    {
      title: 'Predictive risk scoring',
      description: 'Autonomous neural scoring continuously categorizes accounts: Reliable, Watch, or High Risk based on past velocity.',
      icon: <ScoringWireframeIcon />,
      tag: '02 // SCORING'
    },
    {
      title: 'Automated outreach dispatch',
      description: 'Multi-touch WhatsApp, Voice AI & Email outreach with verified virtual accounts and 1-click Razorpay UPI.',
      icon: <DispatchWireframeIcon />,
      tag: '03 // 21D ENGINE'
    },
    {
      title: 'Automated settlement & notice',
      description: 'Instant UTR reconciliation, dispute auto-pauses, and automated Day 22 pre-litigation notice preparation.',
      icon: <SettlementWireframeIcon />,
      tag: '04 // CLEARANCE'
    }
  ];

  return (
    <section id="engine" className="py-24 md:py-32 relative overflow-hidden bg-[#07080D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header - Minimal & Precise matching Dribbble reference */}
        <div className="max-w-3xl mb-16 sm:mb-20">
          <div className="text-xs font-mono text-purple-400 font-semibold tracking-wider uppercase mb-3">
            Core Architecture // 21-Day Engine
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
            Built for the receivables <br />
            <span className="text-gradient-purple">that actually matter.</span>
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base mt-4 max-w-xl leading-relaxed">
            Eliminate manual spreadsheet follow-ups with a calibrated 4-pillar recovery architecture designed to protect enterprise relationships.
          </p>
        </div>

        {/* 4 Clean Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {steps.map((step, idx) => (
            <div 
              key={step.title}
              className="flex flex-col justify-between group pt-4 border-t border-zinc-800/80 hover:border-purple-500/50 transition-colors"
            >
              <div>
                {/* Isometric Wireframe Graphic Header */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="transition-transform duration-300 group-hover:scale-105">
                    {step.icon}
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-zinc-500 group-hover:text-purple-400 transition-colors">
                    {step.tag}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 tracking-tight group-hover:text-purple-300 transition-colors">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
