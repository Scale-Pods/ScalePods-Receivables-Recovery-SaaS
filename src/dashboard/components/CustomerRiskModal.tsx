import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  Check, 
  History
} from 'lucide-react';
import { 
  CustomerProfile, 
  CustomerRiskTier, 
  CadenceIntensity 
} from '../types/dashboard';
import { CompanyAvatar } from './CompanyAvatar';

interface CustomerRiskModalProps {
  customer: CustomerProfile | null;
  onClose: () => void;
  onSaveRiskProfile: (
    customerId: string, 
    newTier: CustomerRiskTier, 
    newCadence: CadenceIntensity, 
    isLocked: boolean, 
    lockedReason: string
  ) => void;
}

export const CustomerRiskModal: React.FC<CustomerRiskModalProps> = ({
  customer,
  onClose,
  onSaveRiskProfile,
}) => {
  if (!customer) return null;

  const [selectedTier, setSelectedTier] = useState<CustomerRiskTier>(customer.riskTier);
  const [isLocked, setIsLocked] = useState<boolean>(customer.isLockedByOwner);
  const [lockedReason, setLockedReason] = useState<string>(customer.lockedReason || '');

  const getCadenceForTier = (tier: CustomerRiskTier): CadenceIntensity => {
    switch (tier) {
      case 'reliable':
        return 'light';
      case 'high_risk':
        return 'intensive';
      case 'watch':
      default:
        return 'standard';
    }
  };

  const handleTierSelect = (tier: CustomerRiskTier) => {
    setSelectedTier(tier);
  };

  const handleSave = () => {
    const newCadence = getCadenceForTier(selectedTier);
    onSaveRiskProfile(
      customer.id,
      selectedTier,
      newCadence,
      isLocked,
      isLocked ? (lockedReason || `Owner locked to ${selectedTier.toUpperCase()} (${newCadence.toUpperCase()})`) : ''
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={customer.company} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-zinc-900 dark:text-white">
                  {customer.company}
                </h3>
                {customer.isLockedByOwner && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                    Owner Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {customer.primaryContact} • {customer.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* Real-time Update Notice */}
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="font-semibold text-zinc-900 dark:text-white">Updates after every payment</span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{customer.lastUpdatedAfterPayment}</p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-lg font-bold text-zinc-900 dark:text-white">{customer.riskScore}/100</span>
              <div className="text-[10px] text-zinc-400">Score</div>
            </div>
          </div>

          {/* Three Buckets: Reliable (Light), Watch (Standard), High Risk (Intensive) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono uppercase tracking-wider text-zinc-400 text-[11px] font-semibold">
                Move Customer to Bucket & Cadence
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                New clients start at Standard
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              
              {/* Reliable */}
              <div
                onClick={() => handleTierSelect('reliable')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTier === 'reliable'
                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/80 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white font-mono">
                    Reliable
                  </span>
                  {selectedTier === 'reliable' && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
                </div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                  → Light Cadence
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Polite statements & longer intervals.
                </p>
              </div>

              {/* Watch */}
              <div
                onClick={() => handleTierSelect('watch')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTier === 'watch'
                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/80 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white font-mono">
                    Watch
                  </span>
                  {selectedTier === 'watch' && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
                </div>
                <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                  → Standard Cadence
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Default for new clients. Regular schedule.
                </p>
              </div>

              {/* High Risk */}
              <div
                onClick={() => handleTierSelect('high_risk')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedTier === 'high_risk'
                    ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/80 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-zinc-900 dark:text-white font-mono">
                    High Risk
                  </span>
                  {selectedTier === 'high_risk' && <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />}
                </div>
                <div className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-medium">
                  → Intensive Cadence
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Accelerated touches & Voice AI.
                </p>
              </div>

            </div>
          </div>

          {/* Lock Choice Toggle */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <Lock className="w-4 h-4 text-amber-500" />
                ) : (
                  <Unlock className="w-4 h-4 text-zinc-400" />
                )}
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    Lock choice against automatic updates
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    When locked, algorithm updates after future payments will not override your choice.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLocked(!isLocked)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                  isLocked ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white dark:bg-zinc-900 shadow-sm transition duration-150 ease-in-out ${
                    isLocked ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isLocked && (
              <div className="mt-3 pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800">
                <input
                  type="text"
                  placeholder="Reason for lock (e.g. Strategic account grace)"
                  value={lockedReason}
                  onChange={(e) => setLockedReason(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* See Why Breakdown */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 font-semibold">
              See Why: Built From Their Own History
            </div>

            {/* Historical metrics */}
            <div className="grid grid-cols-5 gap-1.5 mb-2.5 text-center text-xs">
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Late</span>
                <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{customer.historyFactors.latePaymentsCount}</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Avg Days</span>
                <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{customer.historyFactors.avgDaysLate}d</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Kept</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{customer.historyFactors.promisesKept}</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Broken</span>
                <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{customer.historyFactors.promisesBroken}</span>
              </div>
              <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-mono block">Disputes</span>
                <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{customer.historyFactors.disputesCount}</span>
              </div>
            </div>

            {/* Score points */}
            <div className="space-y-1">
              {customer.scoreBreakdown.map((item, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.factor}</span>
                    <p className="text-[10px] text-zinc-500">{item.explanation}</p>
                  </div>
                  <span className={`font-mono text-[11px] font-semibold ${item.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {item.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
};
