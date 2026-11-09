import React from 'react';
import { Mail, MessageSquare, PhoneCall, Lock, ArrowRight } from 'lucide-react';
import { ChannelPerformance, PlanTier } from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface StagesAndChannelsBlockProps {
  channels: ChannelPerformance[];
  planTier: PlanTier;
  onUpgradePrompt: () => void;
  onFilterByStage?: (stage: string) => void;
}

export const StagesAndChannelsBlock: React.FC<StagesAndChannelsBlockProps> = ({
  channels,
  planTier,
  onUpgradePrompt,
  onFilterByStage,
}) => {
  const isLocked = planTier === 'free';

  const stages = [
    {
      id: 'Friendly',
      name: '1. Friendly',
      description: 'Polite reminder & 1-click Pay link',
      count: 42,
      amount: 1443000,
      activePercent: 30,
    },
    {
      id: 'Firm',
      name: '2. Firm Notice',
      description: 'Overdue warning & plan offer',
      count: 28,
      amount: 1125000,
      activePercent: 55,
    },
    {
      id: 'Escalation',
      name: '3. Escalation',
      description: 'Direct CFO nudge & Voice AI bot',
      count: 12,
      amount: 522000,
      activePercent: 75,
    },
    {
      id: 'Executive/Legal Hold',
      name: '4. Executive Hold',
      description: 'Pre-legal notice & settlement discount',
      count: 4,
      amount: 271000,
      activePercent: 90,
    },
    {
      id: 'Done',
      name: '5. Settled / Done',
      description: 'Payment verified & receipt issued',
      count: 56,
      amount: 924000,
      activePercent: 100,
    },
  ];

  const getChannelIcon = (type: ChannelPerformance['channel']) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-zinc-500" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'voice':
        return <PhoneCall className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Stages & Channels
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Where every invoice sits (Friendly to Done) and Email, WhatsApp, and Voice performance
          </p>
        </div>

        <div className="text-[11px] font-mono text-zinc-400">
          Basic & above
        </div>
      </div>

      <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 shadow-card-light dark:shadow-card-dark overflow-hidden">
        
        {isLocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/70 dark:bg-black/80 backdrop-blur-sm p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center mb-2.5">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Stages & Channels is included in Basic & above
            </h3>
            <p className="text-xs text-zinc-300 max-w-sm mb-3">
              Inspect invoice progression across stages and compare recovery conversion rates across Email, WhatsApp, and Voice.
            </p>
            <button
              onClick={onUpgradePrompt}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
            >
              <span>Preview Basic Tier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Funnel Pipeline */}
        <div className="mb-6">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2.5">
            Recovery Funnel
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
            {stages.map((stg) => (
              <div
                key={stg.id}
                onClick={() => onFilterByStage && onFilterByStage(stg.id)}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                    {stg.name}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500 font-medium">
                    {stg.count} inv
                  </span>
                </div>

                <div className="text-base font-semibold text-zinc-900 dark:text-white font-mono tabular-nums">
                  {formatINR(stg.amount)}
                </div>

                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                  {stg.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Channels Side-by-Side */}
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2.5">
            Channels Side-by-Side
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {channels.map((chan) => (
              <div
                key={chan.channel}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      {getChannelIcon(chan.channel)}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
                        {chan.name}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {chan.activeWorkflows} active cadences
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatINR(chan.recoveredAmount)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 py-2 border-y border-zinc-200/60 dark:border-zinc-800 text-center my-2 text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-mono">Touches</div>
                    <div className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{chan.touchesSent}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-mono">
                      {chan.channel === 'voice' ? 'Connected' : 'Opened/Read'}
                    </div>
                    <div className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{chan.openOrReadPct}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-mono">
                      {chan.channel === 'voice' ? 'Promise' : 'Replied'}
                    </div>
                    <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{chan.replyOrAnswerPct}%</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1">
                  <span>Avg {chan.avgResponseHours}h response</span>
                  <span>{chan.deliveredPct}% delivery</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
