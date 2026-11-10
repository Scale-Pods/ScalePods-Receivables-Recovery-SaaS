import React from 'react';
import { channelFeatures } from '../data/landingData';
import { 
  MessageSquare, 
  PhoneCall, 
  Globe, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react';

export const OmnichannelShowcase: React.FC = () => {
  const getIcon = (name: string) => {
    switch (name) {
      case 'MessageSquare': return <MessageSquare className="w-5 h-5 text-emerald-400" />;
      case 'PhoneCall': return <PhoneCall className="w-5 h-5 text-purple-400" />;
      case 'Globe': return <Globe className="w-5 h-5 text-blue-400" />;
      case 'ShieldAlert': return <ShieldAlert className="w-5 h-5 text-amber-400" />;
      default: return <MessageSquare className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <section id="channels" className="py-20 md:py-28 relative overflow-hidden bg-[#08090E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/25 bg-purple-500/10 text-xs font-mono text-purple-300">
            <span>Omnichannel Dispatch Layer</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Reach Clients Where They Actually Answer.
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            Emails get buried. Phone calls get ignored. RECOVR connects via official WhatsApp Cloud API, polite Indian Voice AI, and tokenized settlement portals.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {channelFeatures.map((feat) => {
            return (
              <div
                key={feat.id}
                className={`glass-card glass-card-hover rounded-2xl p-6 sm:p-8 border ${feat.borderColor} relative overflow-hidden flex flex-col justify-between`}
              >
                {/* Subtle top corner gradient */}
                <div className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl ${feat.accentColor} rounded-full blur-2xl pointer-events-none`} />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
                      {getIcon(feat.iconName)}
                    </div>
                    <span className="text-xs font-mono text-zinc-500 font-medium">
                      {feat.subtitle}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                    {feat.title}
                  </h3>

                  <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
                    {feat.description}
                  </p>

                  <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
                    {feat.bulletPoints.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-500">Enterprise SLA: 99.9% Uptime</span>
                  <span className="text-purple-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Learn channel specs</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
