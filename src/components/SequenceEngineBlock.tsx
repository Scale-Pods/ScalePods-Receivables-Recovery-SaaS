import React, { useState } from 'react';
import { 
  Mail, 
  MessageSquare, 
  PhoneCall, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  AlertTriangle,
  Play,
  Pause
} from 'lucide-react';
import { PlanTier, CadenceIntensity } from '../types/dashboard';

interface SequenceDayStep {
  day: number;
  stage: 'Friendly' | 'Firm' | 'Escalation' | 'Final Blitz' | 'Day 22';
  channels: ('email' | 'whatsapp' | 'voice')[];
  tone: 'Friendly' | 'Firm' | 'Priority' | 'Urgent' | 'Legal';
  headline: string;
  copyPreview: string;
  voiceScript?: string;
  triggerRules: string[];
}

const mock21DaySequence: SequenceDayStep[] = [
  {
    day: 1,
    stage: 'Friendly',
    channels: ['email'],
    tone: 'Friendly',
    headline: 'Due Notice & Razorpay Checkout Link',
    copyPreview: 'Hi {{customer_name}}, this is a reminder that invoice {{invoice_number}} for ₹{{amount}} was due yesterday. Settle securely via UPI/NEFT: {{razorpay_link}}',
    triggerRules: ['Sent post-grace period', 'Stops instantly on Razorpay/bank webhook'],
  },
  {
    day: 3,
    stage: 'Friendly',
    channels: ['whatsapp'],
    tone: 'Friendly',
    headline: 'WhatsApp Quick-Touch',
    copyPreview: 'Namaste {{customer_name}}, invoice {{invoice_number}} (₹{{amount}}) is 3 days overdue. Tap here to pay via UPI/Cards: {{razorpay_link}}. Reply "PAID" to hold.',
    triggerRules: ['WhatsApp opt-in verified', '"PAID" reply triggers 3-day verification hold'],
  },
  {
    day: 5,
    stage: 'Friendly',
    channels: ['email'],
    tone: 'Friendly',
    headline: 'GST Statement & Reconciliation Check-in',
    copyPreview: 'Dear {{customer_name}}, attached is GST invoice {{invoice_number}}. Please confirm if this is awaiting ERP approval so we can assist.',
    triggerRules: ['Includes GSTIN & PO reference', 'Debtor questions create owner ticket'],
  },
  {
    day: 8,
    stage: 'Firm',
    channels: ['email', 'whatsapp'],
    tone: 'Firm',
    headline: 'Day 8 (15+ Bucket Entry)',
    copyPreview: 'Invoice {{invoice_number}} (₹{{amount}}) is 8 days overdue. Please remit today via {{razorpay_link}} or upload NEFT/RTGS UTR proof.',
    triggerRules: ['15+ bucket starting point', 'Bank UTR proof upload enabled'],
  },
  {
    day: 10,
    stage: 'Firm',
    channels: ['whatsapp'],
    tone: 'Firm',
    headline: 'Instalment Offer',
    copyPreview: 'Hi {{customer_name}}, if full settlement is difficult this week, would a two-part NEFT instalment assist? Reply to confirm dates.',
    triggerRules: ['Date promises captured automatically', 'Pauses until promise date'],
  },
  {
    day: 12,
    stage: 'Escalation',
    channels: ['voice', 'whatsapp'],
    tone: 'Priority',
    headline: 'Day 12 (30+ Bucket Entry): Voice AI Call',
    copyPreview: 'Priority voice call to Accounts Payable, followed by WhatsApp summary of call outcome with UPI payment link.',
    voiceScript: 'Namaste, this is the automated accounts assistant regarding invoice {{invoice_number}} for ₹{{amount}}. May I confirm if payment is scheduled this week?',
    triggerRules: ['Strict 9:00 AM – 7:00 PM IST window', '30+ bucket starting point'],
  },
  {
    day: 14,
    stage: 'Escalation',
    channels: ['email', 'whatsapp'],
    tone: 'Priority',
    headline: 'Credit Terms Review Notice',
    copyPreview: 'Notice: Invoice {{invoice_number}} (₹{{amount}}) is 14 days overdue. Unsettled balance may impact commercial credit terms.',
    triggerRules: ['Dashboard alert triggered', 'Factual and verified details only'],
  },
  {
    day: 17,
    stage: 'Final Blitz',
    channels: ['voice', 'whatsapp', 'email'],
    tone: 'Urgent',
    headline: 'Day 17 (60+ Bucket Entry): Daily Blitz',
    copyPreview: 'URGENT: Invoice {{invoice_number}} (₹{{amount}}) is 17 days past due. Daily outreach active. Remit via UPI / NetBanking: {{razorpay_link}}.',
    voiceScript: 'Good morning, urgent escalation call regarding pending balance of ₹{{amount}} for invoice {{invoice_number}}. Please remit today.',
    triggerRules: ['60+ bucket starting point', 'Daily voice calls on Days 17–21'],
  },
  {
    day: 19,
    stage: 'Final Blitz',
    channels: ['voice', 'whatsapp'],
    tone: 'Urgent',
    headline: 'Executive Escalation Notice',
    copyPreview: 'Notice: 48 hours remaining before owner escalation and legal review under MSMED Act. Pay now: {{razorpay_link}}',
    voiceScript: 'Delinquent balance of ₹{{amount}} under invoice {{invoice_number}} is scheduled for MSME escalation in 48 hours.',
    triggerRules: ['1 touch per channel per day limit', 'Audit ledger logs call'],
  },
  {
    day: 21,
    stage: 'Final Blitz',
    channels: ['voice', 'whatsapp', 'email'],
    tone: 'Urgent',
    headline: 'Day 21: Sequence Concludes',
    copyPreview: 'FINAL NOTICE: 21-day autonomous cycle completes today. Outstanding: ₹{{amount}}. Unsettled accounts move to Day 22 review.',
    voiceScript: 'Final automated notification. 21-day recovery sequence is concluding. Please remit via {{razorpay_link}}.',
    triggerRules: ['Autonomous sequence concludes', 'Moves to Day 22 Owner Review'],
  },
  {
    day: 22,
    stage: 'Day 22',
    channels: ['email'],
    tone: 'Legal',
    headline: 'Day 22: MSME & Legal Review',
    copyPreview: 'Autonomous outreach halts. AI prepares Section 16 MSMED statutory interest claim and Section 138 / IBC notice for owner sign-off.',
    triggerRules: ['Human approval required', 'Credit hold & dispatch alert ready'],
  },
];

interface SequenceEngineBlockProps {
  planTier: PlanTier;
  onUpgradePrompt: (tier: PlanTier) => void;
}

export const SequenceEngineBlock: React.FC<SequenceEngineBlockProps> = ({
  planTier,
  onUpgradePrompt,
}) => {
  const [selectedCadence, setSelectedCadence] = useState<CadenceIntensity>('standard');
  const [activeDay, setActiveDay] = useState<number>(1);
  const [previewBucket, setPreviewBucket] = useState<'early' | '15+' | '30+' | '60+'>('early');

  const activeStep = mock21DaySequence.find((s) => s.day === activeDay) || mock21DaySequence[0];

  const bucketStartDay = {
    'early': 1,
    '15+': 8,
    '30+': 12,
    '60+': 17,
  };

  const handleSelectBucket = (b: 'early' | '15+' | '30+' | '60+') => {
    setPreviewBucket(b);
    setActiveDay(bucketStartDay[b]);
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">21-Day Sequence Engine</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Autonomous follow-up cadence from Day 1 to Day 21.</p>
        </div>

        {/* Bucket Shortcuts */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['early', '15+', '30+', '60+'] as const).map((b) => (
            <button
              key={b}
              onClick={() => handleSelectBucket(b)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                previewBucket === b
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {b} (Day {bucketStartDay[b]})
            </button>
          ))}
        </div>
      </div>

      {/* Cadence Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          {
            id: 'light',
            name: 'Light Cadence',
            target: 'Reliable (Score 80–100)',
            desc: 'Email weekly, gentle tone. Standard for prompt payers.',
            tier: 'Free, Basic, Growth, Ent',
          },
          {
            id: 'standard',
            name: 'Standard Cadence',
            target: 'Watch & Default New',
            desc: 'Email + WhatsApp every 3–4 days. System default.',
            tier: 'Basic, Growth, Ent',
          },
          {
            id: 'intensive',
            name: 'Intensive Cadence',
            target: 'High Risk (2+ Overdue)',
            desc: 'Email + WhatsApp + Voice. Daily blitz Days 17–21.',
            tier: 'Growth & Ent',
          },
        ].map((c) => {
          const isSelected = selectedCadence === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCadence(c.id as CadenceIntensity)}
              className={`rounded-xl p-3.5 cursor-pointer transition-all border ${
                isSelected
                  ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-[#0E0F17] shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-zinc-900 dark:text-white">{c.name}</span>
                {isSelected && <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white" />}
              </div>
              <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">{c.target}</div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-2">{c.desc}</p>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono pt-1.5 border-t border-zinc-200 dark:border-zinc-800 flex justify-between">
                <span>Tier:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">{c.tier}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stepper & Inspector */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 space-y-4 shadow-sm">
        {/* Stepper Buttons Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {mock21DaySequence.map((step) => {
            const isCurrent = step.day === activeDay;
            const isDay22 = step.day === 22;

            return (
              <button
                key={step.day}
                onClick={() => setActiveDay(step.day)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                    : isDay22
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <div className={`text-[9px] font-mono uppercase ${isCurrent ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {isDay22 ? 'REVIEW' : `D${step.day}`}
                </div>
                <div className="text-xs font-semibold whitespace-nowrap mt-0.5">
                  {step.stage}
                </div>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  {step.channels.includes('email') && <Mail className="w-2.5 h-2.5 opacity-70" />}
                  {step.channels.includes('whatsapp') && <MessageSquare className="w-2.5 h-2.5 opacity-70" />}
                  {step.channels.includes('voice') && <PhoneCall className="w-2.5 h-2.5 opacity-70" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Step Detail Inspector */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16] p-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Template Copy */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {activeStep.day === 22 ? 'DAY 22' : `DAY ${activeStep.day}`}
                </span>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">{activeStep.headline}</span>
                <span className="ml-auto text-[10px] font-mono text-zinc-500 dark:text-zinc-400">Tone: {activeStep.tone}</span>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-300 font-mono leading-relaxed">
                {activeStep.copyPreview}
              </div>

              {activeStep.voiceScript && (
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200">
                  <div className="text-[10px] font-mono uppercase text-zinc-600 dark:text-zinc-400 font-semibold mb-1 flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" />
                    <span>Voice AI Script (9am–7pm):</span>
                  </div>
                  <p className="italic">"{activeStep.voiceScript}"</p>
                </div>
              )}
            </div>

            {/* Guardrails */}
            <div className="lg:col-span-5 space-y-3">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Rules</span>
                </div>
                <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5">
                  {activeStep.triggerRules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 mt-1.5 flex-shrink-0" />
                      <span>{rule}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 mt-1.5 flex-shrink-0" />
                    <span>Max 1 reminder per day</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
                <span>Required Plan:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">
                  {activeStep.channels.includes('voice') ? 'Growth+' : activeStep.channels.includes('whatsapp') ? 'Basic+' : 'Free'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Never Chase Paid</span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Razorpay webhook halts outreach immediately.</div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] shadow-sm">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>3-Day Hold</span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">"I have paid" pauses outreach 3 business days.</div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] shadow-sm">
          <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-semibold mb-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Calling Hours</span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Strict 9:00 AM – 7:00 PM local customer time.</div>
        </div>

        <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] shadow-sm">
          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Dispute Isolation</span>
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Pauses only the disputed amount.</div>
        </div>
      </div>
    </div>
  );
};
