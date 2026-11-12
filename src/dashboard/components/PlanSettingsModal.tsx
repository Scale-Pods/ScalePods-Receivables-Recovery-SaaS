import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  PhoneCall, 
  SlidersHorizontal,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { PlanTier } from '../types/dashboard';

interface PlanSettingsModalProps {
  currentTier: PlanTier;
  onSelectTier?: (tier: PlanTier) => void;
  onClose: () => void;
}

export const PlanSettingsModal: React.FC<PlanSettingsModalProps> = ({
  currentTier,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'meters' | 'calling_hours' | 'safety'>('meters');

  // Calling Hours State
  const [callStartHour, setCallStartHour] = useState('09:00');
  const [callEndHour, setCallEndHour] = useState('19:00');
  const [suppressSundays, setSuppressSundays] = useState(true);
  const [suppressHolidays, setSuppressHolidays] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#090A10] border border-zinc-200 dark:border-purple-500/30 rounded-2xl shadow-2xl text-zinc-900 dark:text-zinc-100 overflow-hidden my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0D0E16] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Usage & Platform Details</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                Active Tier: <span className="text-purple-600 dark:text-purple-400 font-semibold uppercase">{currentTier}</span> • Usage Quotas, Calling Rules & Consent (IST)
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs: 3 Remaining Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0A0B10] px-6 text-xs">
          {[
            { id: 'meters', label: 'Usage Meters & Quotas' },
            { id: 'calling_hours', label: 'Calling Hours (9am–7pm IST)' },
            { id: 'safety', label: 'Consent & Opt-Out Registry' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600 dark:text-purple-300 font-bold'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: USAGE METERS */}
        {activeTab === 'meters' && (
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Monthly Recovery Resource Quotas</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track invoice enrollment limits, voice call minutes, and automated touches for your active tier.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Meter 1: Invoices entering recovery */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-900 dark:text-white">Invoices Entering Recovery</span>
                  <span className="font-mono text-purple-600 dark:text-purple-300 font-bold">42 / 300 Used (14%)</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-2 rounded-full w-[14%]" />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Resets on 1st of next month. 258 invoice slots remaining under Growth plan.
                </p>
              </div>

              {/* Meter 2: AI Voice Calling Minutes */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-purple-500" />
                    AI Voice Call Minutes
                  </span>
                  <span className="font-mono text-purple-600 dark:text-purple-300 font-bold">38 / 90 Mins (42%)</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full w-[42%]" />
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  52 minutes remaining. Automated voice blitz triggers during Days 17–21.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: CALLING HOURS ENFORCEMENT */}
        {activeTab === 'calling_hours' && (
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Calling-Hour Rules (IST)</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Voice outreach respects debtor Indian Standard Time (IST) business hours (9:00 AM – 7:00 PM) as per TRAI regulations.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16] space-y-4 max-w-xl text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 dark:text-zinc-400 font-mono mb-1">Earliest Call Time (IST)</label>
                  <input
                    type="time"
                    value={callStartHour}
                    onChange={(e) => setCallStartHour(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 dark:text-zinc-400 font-mono mb-1">Latest Call Time (IST)</label>
                  <input
                    type="time"
                    value={callEndHour}
                    onChange={(e) => setCallEndHour(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={suppressSundays}
                    onChange={(e) => setSuppressSundays(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  <span>Suppress calls & WhatsApp on Sundays (Strict quiet day)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={suppressHolidays}
                    onChange={(e) => setSuppressHolidays(e.target.checked)}
                    className="rounded accent-purple-500"
                  />
                  <span>Suppress national gazetted Indian public holidays automatically</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONSENT & OPT-OUT REGISTRY */}
        {activeTab === 'safety' && (
          <div className="p-6 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Opt-Out & Channel Consent</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Audited opt-out records across email, WhatsApp, and voice under Indian IT & TRAI guidelines.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16] divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {[
                { customer: 'Vikram Malhotra (Vortex Media LLP)', channel: 'Voice Calls', date: 'Oct 28, 2026', status: 'Opted Out', reason: 'Customer requested email-only outreach' },
                { customer: 'Kavita Patel (Apex Cloud Tech Pvt Ltd)', channel: 'WhatsApp', date: 'Nov 01, 2026', status: 'Active Consent', reason: 'Explicit double opt-in verified' },
                { customer: 'Rajesh Sharma (Nexora Infotech Pvt Ltd)', channel: 'Voice Calls', date: 'Oct 14, 2026', status: 'Active Consent', reason: 'B2B commercial Master Services Agreement clause 14.2' },
              ].map((rec, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-white">{rec.customer}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{rec.reason} • {rec.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{rec.channel}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${rec.status === 'Opted Out' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}`}>
                      {rec.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0D0E16] flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer">
            <span>Done</span>
          </button>
        </div>

      </div>
    </div>
  );
};
