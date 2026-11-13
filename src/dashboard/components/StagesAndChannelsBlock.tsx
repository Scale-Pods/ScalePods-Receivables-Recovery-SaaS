import React from 'react';
import { 
  Mail, 
  MessageSquare, 
  PhoneCall, 
  Lock, 
  ArrowRight, 
  Layers, 
  BarChart3,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';
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
      id: 'Executive Hold',
      name: '4. Executive Hold',
      description: 'Executive review & structured settlement',
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
        return <Mail className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'voice':
        return <PhoneCall className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Recovery Pipeline & Outreach Channels
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Where active invoices sit across the recovery funnel and conversion performance by outreach channel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
            Basic & Above
          </span>
          {isLocked && (
            <button
              onClick={onUpgradePrompt}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <span>Unlock Pipeline Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Upgrade Wall Overlay */}
        {isLocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/60 dark:bg-black/75 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-11 h-11 rounded-2xl bg-zinc-800/90 border border-zinc-700 text-white flex items-center justify-center mb-3 shadow-lg">
              <Lock className="w-5 h-5 text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              Pipeline Stages & Channels included in Basic Plan
            </h3>
            <p className="text-xs text-zinc-300 max-w-md mb-4 leading-relaxed">
              Track invoice progression through friendly notices to executive holds, and compare recovery rates across Email, WhatsApp, and Voice.
            </p>
            <button
              onClick={onUpgradePrompt}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-2 shadow-md cursor-pointer"
            >
              <span>Preview Basic Tier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Funnel Pipeline Section */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#0A0B10] p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Invoice Recovery Funnel
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Click any stage to filter active debts in the primary ledger.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white">
              5 Stages • 142 Total Invoices
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {stages.map((stg) => {
              const isSettled = stg.id === 'Done';

              return (
                <div
                  key={stg.id}
                  onClick={() => onFilterByStage && onFilterByStage(stg.id)}
                  className={`rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col justify-between ${
                    isSettled
                      ? 'border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-950/10 hover:border-emerald-500/50'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-zinc-900 dark:text-white font-mono text-[11px]">
                        {stg.name}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        isSettled
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {stg.count} inv
                      </span>
                    </div>

                    <div className="text-base font-bold text-zinc-900 dark:text-white font-mono tabular-nums">
                      {formatINR(stg.amount)}
                    </div>

                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {stg.description}
                    </p>
                  </div>

                  {/* Micro Progress Bar */}
                  <div className="mt-3 pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
                    <div className="w-full h-1.5 bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isSettled ? 'bg-emerald-500' : 'bg-zinc-900 dark:bg-white'
                        }`}
                        style={{ width: `${stg.activePercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outreach Channels Side-by-Side */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#0A0B10] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Channel Conversion & Recovery Yield
                </h3>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Delivery rate, engagement, and direct cash yield for each outreach channel.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              Total Yield: ₹9,24,000
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channels.map((chan) => (
              <div
                key={chan.channel}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0E0F17] p-4 flex flex-col justify-between shadow-sm"
              >
                <div>
                  {/* Channel Header */}
                  <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        {getChannelIcon(chan.channel)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                          {chan.name.replace('Smart Cadence', 'Smart Outreach')}
                        </h4>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {chan.activeWorkflows} active workflows
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatINR(chan.recoveredAmount)}
                    </span>
                  </div>

                  {/* 3 Metric Columns */}
                  <div className="grid grid-cols-3 gap-2 py-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">Touches</div>
                      <div className="font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {chan.touchesSent}
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80">
                      <div className="text-[10px] text-zinc-500 uppercase font-mono">
                        {chan.channel === 'voice' ? 'Connected' : 'Opened'}
                      </div>
                      <div className="font-mono font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                        {chan.openOrReadPct}%
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/80">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                        {chan.channel === 'voice' ? 'Promise' : 'Replied'}
                      </div>
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {chan.replyOrAnswerPct}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Avg {chan.avgResponseHours}h response</span>
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">{chan.deliveredPct}% delivered</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
