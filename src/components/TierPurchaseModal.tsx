import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  CreditCard, 
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount, PlanTierType } from '../types/auth';
import { initiateRazorpayPayment } from '../lib/razorpay';
import { 
  sendPlanPurchaseWebhook, 
  createRazorpayOrderViaWebhook, 
  sendPaymentVerificationWebhook 
} from '../lib/webhook';

interface TierPurchaseModalProps {
  isOpen: boolean;
  plan?: { id: string } | null;
  isAnnual?: boolean;
  currentUser: UserAccount | null;
  onClose: () => void;
  onUpgradeSuccess: (newTier: PlanTierType, cycle: 'monthly' | 'annual') => void;
  onRequireAuth: () => void;
}

interface EntitlementTier {
  id: PlanTierType;
  name: string;
  badge: string;
  isPopular?: boolean;
  isCustomPrice?: boolean;
  monthlyPrice: number;
  annualPrice: number;
  period: string;
  invoiceQuota: string;
  channels: string;
  callMinutes: string;
  sequences: string;
  aiFeatures: string;
}

export const planEntitlements: EntitlementTier[] = [
  {
    id: 'free',
    name: 'Free',
    badge: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    period: 'forever',
    invoiceQuota: '10 invoices / mo',
    channels: 'Email only',
    callMinutes: 'None',
    sequences: 'Light only (Day 1)',
    aiFeatures: 'Invoice reading & templates',
  },
  {
    id: 'basic',
    name: 'Basic',
    badge: 'Test Plan (₹1)',
    monthlyPrice: 1,
    annualPrice: 1,
    period: 'per month',
    invoiceQuota: '50 invoices / mo',
    channels: 'Email, WhatsApp',
    callMinutes: 'None',
    sequences: 'Light & Standard, tone choice',
    aiFeatures: 'Adds message writing in business tone',
  },
  {
    id: 'growth',
    name: 'Growth',
    badge: 'Most Popular',
    isPopular: true,
    monthlyPrice: 7999,
    annualPrice: 6399,
    period: 'per month',
    invoiceQuota: '300 invoices / mo',
    channels: 'Email, WhatsApp, AI Voice Calls',
    callMinutes: '90 AI voice mins / mo',
    sequences: 'Light, Standard, Intensive + 21-Day editor',
    aiFeatures: 'Reply reading, promise capture, multi-lingual',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'Autonomous',
    isCustomPrice: true,
    monthlyPrice: 0,
    annualPrice: 0,
    period: 'contract',
    invoiceQuota: 'Unlimited volume',
    channels: 'All + Dedicated WhatsApp & Custom Voice',
    callMinutes: 'Custom / Pooled quota',
    sequences: 'Custom sequences of any length (7-90+ days)',
    aiFeatures: 'AI-agreed payment plans, self-improving timing',
  },
];

export const TierPurchaseModal: React.FC<TierPurchaseModalProps> = ({
  isOpen,
  plan,
  isAnnual = true,
  currentUser,
  onClose,
  onUpgradeSuccess,
  onRequireAuth,
}) => {
  // Current active tier
  const currentTier = (currentUser?.planTier?.toLowerCase() || 'free') as PlanTierType;

  // Selected plan to switch to / pay for
  const [selectedTierId, setSelectedTierId] = useState<PlanTierType>('growth');
  const [billingAnnual, setBillingAnnual] = useState<boolean>(isAnnual);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (plan?.id) {
      setSelectedTierId(plan.id as PlanTierType);
    } else if (currentTier === 'free') {
      setSelectedTierId('growth');
    } else if (currentTier === 'basic') {
      setSelectedTierId('growth');
    } else if (currentTier === 'growth') {
      setSelectedTierId('enterprise');
    } else {
      setSelectedTierId('growth');
    }
    setBillingAnnual(isAnnual);
    setIsComplete(false);
    setIsProcessing(false);
  }, [isOpen, plan, isAnnual, currentTier]);

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

  // Active target plan
  const targetPlan = planEntitlements.find(p => p.id === selectedTierId) || planEntitlements[2];
  const isSelectedCurrent = targetPlan.id === currentTier;
  const isFreePlan = targetPlan.id === 'free';
  const isCustomPrice = targetPlan.isCustomPrice;
  const activeRate = billingAnnual ? targetPlan.annualPrice : targetPlan.monthlyPrice;
  const formattedPrice = isCustomPrice 
    ? 'Custom' 
    : isFreePlan 
      ? '₹0' 
      : `₹${activeRate.toLocaleString('en-IN')}`;

  // Select a plan card in matrix
  const handlePlanCardClick = (tier: EntitlementTier) => {
    setSelectedTierId(tier.id);
  };

  // Execute payment & plan switch via Razorpay
  const handleConfirmSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSelectedCurrent) return;

    const payableAmount = targetPlan.id === 'basic' 
      ? 1 
      : (billingAnnual ? targetPlan.annualPrice * 12 : targetPlan.monthlyPrice);

    // Free tier downgrade doesn't require payment
    if (isFreePlan) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setIsComplete(true);
        onUpgradeSuccess('free', 'monthly');
      }, 500);
      return;
    }

    // Enterprise custom plan activation
    if (isCustomPrice) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setIsComplete(true);
        onUpgradeSuccess('enterprise', 'annual');
      }, 1000);
      return;
    }

    setIsProcessing(true);

    // 1. Create Razorpay Order via n8n server-side webhook
    let generatedOrderId: string | null = null;
    let orderAmountInPaise: number | null = null;
    let orderCurrency: string = 'INR';
    let orderKeyId: string | null = null;

    if (currentUser) {
      try {
        const orderResult = await createRazorpayOrderViaWebhook({
          name: currentUser.name,
          email: currentUser.email,
          companyName: currentUser.companyName,
          plan: targetPlan.name,
          planId: targetPlan.id,
          billingCycle: billingAnnual ? 'annual' : 'monthly',
          amount: payableAmount,
        });

        if (orderResult.orderId) {
          generatedOrderId = orderResult.orderId;
          if (orderResult.amountInPaise) orderAmountInPaise = orderResult.amountInPaise;
          if (orderResult.currency) orderCurrency = orderResult.currency;
          if (orderResult.keyId) orderKeyId = orderResult.keyId;
        }
      } catch (e) {
        console.warn('Order webhook call notice:', e);
      }
    }

    // 2. Open Razorpay Checkout modal with the generated order_id & key_id
    await initiateRazorpayPayment({
      amountInINR: payableAmount,
      amountInPaise: orderAmountInPaise,
      currency: orderCurrency,
      orderId: generatedOrderId,
      keyId: orderKeyId,
      planName: targetPlan.name,
      planId: targetPlan.id,
      billingCycle: billingAnnual ? 'annual' : 'monthly',
      companyName: currentUser.companyName,
      userEmail: currentUser.email,
      userName: currentUser.name,
      onSuccess: async (response) => {
        setIsProcessing(false);
        setIsComplete(true);

        // 3. Send payment details (payment_id, order_id, signature) for verification
        await sendPaymentVerificationWebhook({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || generatedOrderId || undefined,
          razorpay_signature: response.razorpay_signature,
          name: currentUser.name,
          email: currentUser.email,
          companyName: currentUser.companyName,
          plan: targetPlan.name,
          planId: targetPlan.id,
          billingCycle: billingAnnual ? 'annual' : 'monthly',
          amount: payableAmount,
        });

        // Confetti celebration
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });

        // Synchronize with database and active session
        onUpgradeSuccess(targetPlan.id, billingAnnual ? 'annual' : 'monthly');
      },
      onDismiss: () => {
        setIsProcessing(false);
      },
      onError: (err) => {
        setIsProcessing(false);
        console.warn('Payment failed or cancelled:', err);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl glass-card rounded-2xl border border-purple-500/30 p-5 sm:p-7 text-white shadow-2xl relative overflow-hidden bg-[#0C0D18] max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
          aria-label="Close upgrade modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!isComplete ? (
          <div>
            {/* Header with Active Tier and Annual Switcher */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Plan Tiers & Entitlements
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  Active Tier: <span className="text-purple-400 font-bold uppercase">{currentTier}</span> • {currentUser.companyName}
                </p>
              </div>

              {/* Monthly vs Annual Toggle */}
              <div className="inline-flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBillingAnnual(false)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    !billingAnnual ? 'bg-purple-600 text-white font-bold shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingAnnual(true)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingAnnual ? 'bg-purple-600 text-white font-bold shadow-md' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    -20% OFF
                  </span>
                </button>
              </div>
            </div>

            {/* 4-COLUMN ENTITLEMENTS COMPARISON MATRIX (Exact Layout as Dashboard Settings) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {planEntitlements.map((p) => {
                const isActive = currentTier === p.id;
                const isSelected = selectedTierId === p.id;
                const price = p.isCustomPrice 
                  ? 'Custom' 
                  : p.id === 'free' 
                    ? '₹0' 
                    : `₹${(billingAnnual ? p.annualPrice : p.monthlyPrice).toLocaleString('en-IN')}`;

                return (
                  <div
                    key={p.id}
                    onClick={() => handlePlanCardClick(p)}
                    className={`rounded-2xl border p-4 flex flex-col justify-between transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-purple-500 bg-purple-600/15 shadow-xl shadow-purple-950/40 ring-1 ring-purple-500/50'
                        : isActive
                          ? 'border-emerald-500/40 bg-emerald-950/10'
                          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900/90'
                    }`}
                  >
                    <div>
                      {/* Name & Badge */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white">{p.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          p.isPopular
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {p.badge}
                        </span>
                      </div>

                      {/* Price Display */}
                      <div className="mb-3">
                        <span className="text-2xl font-bold font-mono text-white">{price}</span>
                        <span className="text-[10px] text-zinc-400 ml-1 font-mono">
                          /{p.id === 'free' ? 'forever' : billingAnnual ? 'mo (billed annually)' : p.period}
                        </span>
                      </div>

                      {/* Entitlements Specs List */}
                      <div className="space-y-2 text-[11px] text-zinc-300 font-mono border-t border-zinc-800 pt-3">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Volume:</span>
                          <strong className="text-zinc-200">{p.invoiceQuota}</strong>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Channels:</span>
                          <span className="text-zinc-300">{p.channels}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Voice Minutes:</span>
                          <span className={p.callMinutes !== 'None' ? 'text-purple-400 font-bold' : 'text-zinc-500'}>
                            {p.callMinutes}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Sequences:</span>
                          <span className="text-zinc-300">{p.sequences}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">AI Engine:</span>
                          <span className="text-zinc-400">{p.aiFeatures}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Button */}
                    <div className="pt-4 mt-4 border-t border-zinc-800">
                      {isActive ? (
                        <div className="w-full py-2 rounded-xl text-xs font-mono font-bold text-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                          Active Current Plan ✓
                        </div>
                      ) : isSelected ? (
                        <div className="w-full py-2 rounded-xl text-xs font-bold text-center text-white bg-purple-600 shadow-md shadow-purple-600/30">
                          Selected for Upgrade ✓
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlanCardClick(p);
                          }}
                          className="w-full py-2 rounded-xl text-xs font-semibold text-center text-zinc-300 bg-zinc-800 hover:bg-purple-600 hover:text-white transition-colors cursor-pointer"
                        >
                          Select {p.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAYMENT & CHECKOUT STEP: ONLY THEN CAN USER SWITCH */}
            {!isSelectedCurrent && (
              <form onSubmit={handleConfirmSwitch} className="rounded-2xl border border-purple-500/30 bg-purple-950/15 p-5 sm:p-6 space-y-4">
                
                {/* Summary Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Payment for {targetPlan.name} Tier</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                          {billingAnnual ? 'Annual Billing (-20%)' : 'Monthly Billing'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">
                        Subscriber: <strong className="text-zinc-200">{currentUser.companyName}</strong> ({currentUser.email})
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-2xl font-black font-mono text-white">
                      {formattedPrice}
                      {!isCustomPrice && !isFreePlan && (
                        <span className="text-xs font-normal text-zinc-400 ml-1">/mo</span>
                      )}
                    </div>
                    {!isCustomPrice && !isFreePlan && (
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {targetPlan.id === 'basic'
                          ? 'Test payment mode: Flat ₹1 total'
                          : billingAnnual 
                            ? `₹${(targetPlan.annualPrice * 12).toLocaleString('en-IN')}/year total (Saved ₹${((targetPlan.monthlyPrice - targetPlan.annualPrice) * 12).toLocaleString('en-IN')})` 
                            : 'Billed monthly recurring'}
                      </div>
                    )}
                  </div>
                </div>

                {/* If Free Tier: confirmation note */}
                {isFreePlan && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    Switching to the <strong>Free Tier</strong> will restrict monthly recovery to 10 invoices and email-only reminders. No payment is charged.
                  </div>
                )}

                {/* SUBMIT BUTTON: ONLY AFTER PAYMENT HANDSHAKE */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Opening Razorpay & Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isFreePlan 
                          ? 'Confirm Downgrade to Free Tier'
                          : isCustomPrice
                            ? 'Request Enterprise Contract Activation'
                            : `Pay ${formattedPrice} via Razorpay & Switch to ${targetPlan.name}`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {isSelectedCurrent && (
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400 font-mono">
                You are currently active on the <strong className="text-white">{targetPlan.name} Tier</strong>. Select any other tier in the matrix above to view payment options and upgrade.
              </div>
            )}
          </div>
        ) : (
          /* CONFIRMATION SUCCESS VIEW */
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <h3 className="text-2xl font-black text-white">
              Payment Confirmed & Plan Upgraded!
            </h3>

            <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
              <strong>{currentUser.companyName}</strong> is now successfully switched to the <strong className="text-purple-300">{targetPlan.name} Tier</strong>. 
              Your Supabase credentials have been updated, and higher limits are now active.
            </p>

            <div className="pt-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 shadow-md shadow-purple-600/30 transition-colors cursor-pointer"
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
