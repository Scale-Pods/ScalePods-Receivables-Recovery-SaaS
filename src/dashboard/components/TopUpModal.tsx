import React, { useState } from 'react';
import { X, Zap, PhoneCall, FileText, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { PlanTier } from '../types/dashboard';
import { QuotaUsage } from '../utils/quota';

interface TopUpModalProps {
  planTier: PlanTier;
  quota: QuotaUsage;
  onApplyTopUp: (extraInvoices: number, extraMinutes: number, packName: string) => void;
  onOpenUpgrade?: () => void;
  onClose: () => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  planTier,
  quota,
  onApplyTopUp,
  onOpenUpgrade,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'invoices' | 'voice'>('invoices');

  const invoicePacks = [
    { id: 'inv-25', name: '+25 Invoices Pack', invoices: 25, price: '₹999', popular: false, desc: 'Great for month-end reconciliation spikes' },
    { id: 'inv-100', name: '+100 Invoices Pack', invoices: 100, price: '₹2,499', popular: true, desc: 'Best value for active quarterly recovery campaigns' },
    { id: 'inv-250', name: '+250 Invoices Pack', invoices: 250, price: '₹4,999', popular: false, desc: 'High-volume seasonal clearing pack' },
  ];

  const voicePacks = [
    { id: 'vc-30', name: '+30 Voice Minutes', minutes: 30, price: '₹899', popular: false, desc: '~15 autonomous debtor voice calls' },
    { id: 'vc-90', name: '+90 Voice Minutes', minutes: 90, price: '₹1,999', popular: true, desc: 'Standard 21-day blitz pack (Days 17–21)' },
    { id: 'vc-200', name: '+200 Voice Minutes', minutes: 200, price: '₹3,799', popular: false, desc: 'Enterprise intensive escalation buffer' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#090A10] border border-zinc-200 dark:border-purple-500/30 rounded-2xl shadow-2xl text-zinc-900 dark:text-zinc-100 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0D0E16] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Resource Top-Up & Quota Packs</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                Active Tier: <span className="text-purple-600 dark:text-purple-400 font-semibold uppercase">{planTier}</span> • Instantly add recovery capacity
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Quota Status Pill Bar */}
        <div className="px-6 py-3 bg-purple-500/5 dark:bg-purple-950/20 border-b border-purple-500/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">Invoices:</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-white">
              {quota.invoicesUsed} / {quota.isCustom ? 'Custom' : quota.invoiceLimit}
            </span>
            <span className="text-[11px] text-zinc-400">({quota.invoicesRemaining} slots remaining)</span>
          </div>

          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-indigo-500" />
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">Voice AI:</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-white">
              {quota.voiceMinutesLimit > 0 ? `${quota.voiceMinutesUsed} / ${quota.voiceMinutesLimit} mins` : 'Not on plan'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0A0B10] px-6 text-xs">
          <button
            onClick={() => setSelectedCategory('invoices')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              selectedCategory === 'invoices'
                ? 'border-purple-500 text-purple-600 dark:text-purple-300 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoice Capacity Packs</span>
          </button>

          <button
            onClick={() => setSelectedCategory('voice')}
            className={`py-3 px-4 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              selectedCategory === 'voice'
                ? 'border-purple-500 text-purple-600 dark:text-purple-300 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Voice Call Minutes</span>
          </button>
        </div>

        {/* Body Packs */}
        <div className="p-6 space-y-4">
          {selectedCategory === 'invoices' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Top-up invoice slots apply immediately to your active billing month and do not expire until your cycle resets.
              </p>

              <div className="grid grid-cols-1 gap-2.5">
                {invoicePacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                      pack.popular
                        ? 'border-purple-500/50 bg-purple-500/5 dark:bg-purple-950/20'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">{pack.name}</span>
                        {pack.popular && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500 text-white font-bold">
                            POPULAR
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{pack.desc}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">{pack.price}</span>
                      <button
                        onClick={() => onApplyTopUp(pack.invoices, 0, pack.name)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-sm shadow-purple-600/30 text-white cursor-pointer transition-all"
                      >
                        Add to Quota
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCategory === 'voice' && (
            <div className="space-y-3">
              {planTier === 'free' || planTier === 'basic' ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <div className="font-bold mb-0.5">Voice AI Outreach Requires Growth or Enterprise Plan</div>
                    <p className="text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                      Voice call automation triggers during Days 17–21 of recovery. Upgrade to Growth (includes 90 mins/month) to run autonomous phone calls.
                    </p>
                    {onOpenUpgrade && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenUpgrade();
                        }}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-300 hover:underline cursor-pointer"
                      >
                        Upgrade to Growth Tier <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-2.5">
                {voicePacks.map((pack) => (
                  <div
                    key={pack.id}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                      pack.popular
                        ? 'border-indigo-500/50 bg-indigo-500/5 dark:bg-indigo-950/20'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">{pack.name}</span>
                        {pack.popular && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500 text-white font-bold">
                            BEST FOR CADENCE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{pack.desc}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">{pack.price}</span>
                      <button
                        onClick={() => onApplyTopUp(0, pack.minutes, pack.name)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors"
                      >
                        Add Minutes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upgrade Banner Suggestion */}
          {onOpenUpgrade && planTier !== 'enterprise' && (
            <div className="mt-4 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                <span className="text-zinc-600 dark:text-zinc-300">
                  Need consistent monthly volume? Upgrading your tier gives higher permanent limits.
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenUpgrade();
                }}
                className="font-bold text-purple-600 dark:text-purple-400 hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
              >
                View Plans <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
