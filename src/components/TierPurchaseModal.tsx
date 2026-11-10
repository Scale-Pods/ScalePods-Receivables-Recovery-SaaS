import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, Sparkles, CreditCard, ArrowRight, Building2, Zap, Lock, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PricingPlan, pricingPlans } from '../data/landingData';
import { UserAccount, PlanTierType, STORAGE_KEY_USER } from '../types/auth';

interface TierPurchaseModalProps {
  isOpen: boolean;
  plan?: PricingPlan | null;
  isAnnual?: boolean;
  currentUser: UserAccount | null;
  onClose: () => void;
  onUpgradeSuccess: (newTier: PlanTierType, cycle: 'monthly' | 'annual') => void;
  onRequireAuth: () => void;
}

export const TierPurchaseModal: React.FC<TierPurchaseModalProps> = ({
  isOpen,
  plan,
  isAnnual = true,
  currentUser,
  onClose,
  onUpgradeSuccess,
  onRequireAuth,
}) => {
  // Available upgrade tiers (Basic, Growth, Enterprise)
  const upgradeTiers = pricingPlans.filter(p => p.id !== 'free');

  // Active user selection states
  const [selectedTierId, setSelectedTierId] = useState<string>(plan?.id && plan.id !== 'free' ? plan.id : 'growth');
  const [billingAnnual, setBillingAnnual] = useState<boolean>(isAnnual);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Sync initial state when modal opens
  useEffect(() => {
    if (plan?.id && plan.id !== 'free') {
      setSelectedTierId(plan.id);
    } else if (currentUser?.planTier === 'basic') {
      setSelectedTierId('growth');
    } else {
      setSelectedTierId('growth');
    }
    setBillingAnnual(isAnnual);
    setIsComplete(false);
    setIsProcessing(false);
  }, [isOpen, plan, isAnnual, currentUser?.planTier]);

  if (!isOpen) return null;

  // If user is not logged in, prompt signup/login first
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
        <div 
          className="w-full max-w-md glass-card rounded-2xl border border-purple-500/30 p-6 sm:p-7 text-white shadow-2xl relative bg-[#0C0D18] text-center space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight">
            Account Required to Upgrade
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Please create an account or log in first. All new accounts start on the <strong>Free Tier</strong> and can upgrade anytime.
          </p>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={() => { onClose(); onRequireAuth(); }}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              Log In or Create Account
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active selected plan details
  const activePlan = upgradeTiers.find(p => p.id === selectedTierId) || upgradeTiers[1];
  const isCustom = activePlan.isCustomPrice;
  const priceAmount = billingAnnual ? activePlan.annualPriceINR : activePlan.monthlyPriceINR;
  const formattedPrice = isCustom ? 'Custom Quote' : `₹${priceAmount.toLocaleString('en-IN')}`;
  const isAlreadyOnThisTier = currentUser.planTier.toLowerCase() === activePlan.id.toLowerCase();

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAlreadyOnThisTier) return;

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);

      // Trigger Confetti
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Update in localStorage
      const updatedUser: UserAccount = {
        ...currentUser,
        planTier: activePlan.id as PlanTierType,
        billingCycle: billingAnnual ? 'annual' : 'monthly',
      };
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
      } catch (err) {
        console.warn('Failed to update user tier in localStorage', err);
      }

      onUpgradeSuccess(activePlan.id as PlanTierType, billingAnnual ? 'annual' : 'monthly');
    }, 850);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl glass-card rounded-2xl border border-purple-500/30 p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden bg-[#0C0D18] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!isComplete ? (
          <div>
            {/* Header & Billing Cycle Switcher */}
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <span>Choose Your Plan</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Current plan: <strong className="text-white uppercase">{currentUser.planTier}</strong>. Select a tier to upgrade.
                </p>
              </div>

              {/* Monthly / Annual Toggle */}
              <div className="inline-flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setBillingAnnual(false)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    !billingAnnual ? 'bg-purple-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingAnnual(true)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    billingAnnual ? 'bg-purple-600 text-white font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] text-emerald-300 font-bold">-20%</span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid: Choose between Basic, Growth, and Enterprise */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {upgradeTiers.map((p) => {
                const isSelected = selectedTierId === p.id;
                const isCurrent = currentUser.planTier.toLowerCase() === p.id.toLowerCase();
                const price = p.isCustomPrice 
                  ? 'Custom' 
                  : `₹${(billingAnnual ? p.annualPriceINR : p.monthlyPriceINR).toLocaleString('en-IN')}`;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedTierId(p.id)}
                    className={`relative p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-500 bg-purple-600/15 shadow-[0_0_20px_rgba(124,58,237,0.25)] ring-1 ring-purple-500/50'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    {/* Badge */}
                    {p.badge && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500 text-white uppercase shadow-sm">
                        {p.badge}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white">{p.name}</span>
                        {/* Radio Checkmark */}
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-purple-400 bg-purple-600' : 'border-zinc-700 bg-zinc-800'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1 my-2">
                        <span className="text-lg font-black font-mono text-white">{price}</span>
                        {!p.isCustomPrice && (
                          <span className="text-[10px] text-zinc-400 font-mono">/mo</span>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 leading-tight">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-zinc-800/80 text-[11px] font-mono">
                      {isCurrent ? (
                        <span className="text-zinc-500">Current Plan</span>
                      ) : (
                        <span className={isSelected ? 'text-purple-300 font-bold' : 'text-zinc-400'}>
                          {isSelected ? '✓ Selected' : 'Click to select'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Plan Details & Payment Form */}
            <form onSubmit={handlePurchase} className="space-y-4">
              
              {/* Order Summary Box */}
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>{currentUser.companyName}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Upgrading to: <strong className="text-purple-300">{activePlan.name}</strong> ({billingAnnual ? 'Annual -20%' : 'Monthly'})
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black font-mono text-white">
                    {formattedPrice}
                  </div>
                  {!isCustom && (
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {billingAnnual ? 'Billed annually' : 'Billed monthly'}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Selector (For Paid Plans) */}
              {!isCustom && !isAlreadyOnThisTier && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-medium ${
                        paymentMethod === 'upi'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      UPI / QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-medium ${
                        paymentMethod === 'card'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Credit / Debit Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer font-medium ${
                        paymentMethod === 'netbanking'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      Net Banking
                    </button>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {isAlreadyOnThisTier ? (
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400 font-mono">
                  You are currently active on the <strong>{activePlan.name} Tier</strong>. Select another plan above to switch.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isProcessing ? (
                    <span>Processing Upgrade...</span>
                  ) : (
                    <>
                      <span>
                        {isCustom 
                          ? 'Request Enterprise Custom Activation' 
                          : `Confirm & Upgrade to ${activePlan.name} (${formattedPrice})`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

            </form>
          </div>
        ) : (
          /* Confirmation Success View */
          <div className="py-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h3 className="text-2xl font-black text-white">
              Plan Upgraded to {activePlan.name}!
            </h3>

            <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
              <strong>{currentUser.companyName}</strong> is now upgraded to the <strong>{activePlan.name} Tier</strong>. Higher volume limits and features are active.
            </p>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Close & Return to Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
