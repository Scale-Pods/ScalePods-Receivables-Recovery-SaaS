import React, { useState } from 'react';
import { pricingPlans, PricingPlan } from '../data/landingData';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { UserAccount } from '../types/auth';

interface PricingSectionProps {
  currentUser: UserAccount | null;
  onSelectPlan: (plan: PricingPlan, isAnnual: boolean) => void;
  onOpenAuth: (mode?: 'signup' | 'signin') => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  currentUser,
  onSelectPlan,
  onOpenAuth,
}) => {
  const [isAnnual, setIsAnnual] = useState(true);

  const formatPrice = (plan: PricingPlan) => {
    if (plan.monthlyPriceINR === 0 && !plan.isCustomPrice) return '₹0';
    if (plan.isCustomPrice) return 'Custom';
    const price = isAnnual ? plan.annualPriceINR : plan.monthlyPriceINR;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <section id="pricing" className="py-20 md:py-28 relative overflow-hidden bg-grid-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/25 bg-purple-500/10 text-xs font-mono text-purple-300">
            <span>Simple, Transparent Pricing</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            <span className="text-gradient-purple">Keep 100% of Every Rupee Recovered.</span>
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            No commission cuts. No hidden percentage take rates.
          </p>

          {/* Modern Segmented Billing Toggle */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-[#0C0D17] border border-zinc-800/90 shadow-xl shadow-black/40 backdrop-blur-md relative">
              {/* Monthly Button */}
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`relative px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  !isAnnual
                    ? 'text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>

              {/* Annual Button with Save 20% badge */}
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`relative px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  isAnnual
                    ? 'text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md shadow-purple-600/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition-all ${
                  isAnnual
                    ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  Save 20%
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto items-stretch">
          {pricingPlans.map((plan) => {
            const isCurrentActiveTier = currentUser?.planTier === plan.id;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative ${
                  isCurrentActiveTier
                    ? 'glass-card border-emerald-500 shadow-2xl shadow-emerald-600/20 bg-gradient-to-b from-emerald-950/20 via-zinc-900/90 to-[#0A0B12]'
                    : plan.highlighted
                    ? 'glass-card border-purple-500 shadow-2xl shadow-purple-600/20 bg-gradient-to-b from-purple-950/30 via-zinc-900/90 to-[#0A0B12]'
                    : 'glass-card border-zinc-800/90 bg-[#0B0C13]/80 hover:border-zinc-700'
                }`}
              >
                {/* Popular Pill or Active Pill */}
                {isCurrentActiveTier ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider text-white bg-emerald-600 shadow-sm border border-emerald-400/40 whitespace-nowrap">
                    ✓ Your Current Plan
                  </div>
                ) : plan.badge ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-sm border border-purple-400/30 whitespace-nowrap">
                    {plan.badge}
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {plan.name}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-400 mb-6 leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-zinc-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                        {formatPrice(plan)}
                      </span>
                      {!plan.isCustomPrice && plan.monthlyPriceINR > 0 && (
                        <span className="text-xs text-zinc-500 font-mono">
                          / month
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-1 min-h-[16px]">
                      {plan.monthlyPriceINR === 0 && !plan.isCustomPrice
                        ? 'Free forever • No credit card'
                        : plan.isCustomPrice
                        ? 'Tailored volume & custom SLA'
                        : plan.id === 'basic'
                        ? 'Test payment plan • ₹1 charge'
                        : isAnnual
                        ? 'Billed annually with 20% discount'
                        : 'Billed monthly, cancel anytime'}
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    <div className="text-[11px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
                      Included Capabilities
                    </div>
                    {plan.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                {isCurrentActiveTier ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-xl font-bold text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-2 cursor-default"
                  >
                    <span>Current Active Tier</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!currentUser && plan.id === 'free') {
                        onOpenAuth('signup');
                      } else {
                        onSelectPlan(plan, isAnnual);
                      }
                    }}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-600/30 hover:opacity-95'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    }`}
                  >
                    <span>
                      {currentUser 
                        ? (plan.id === 'enterprise' ? 'Contact for Enterprise' : `Upgrade to ${plan.name}`) 
                        : plan.ctaLabel}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
