import React, { useState } from 'react';
import { 
  Mail, 
  MessageSquare, 
  PhoneCall, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Check, 
  Sliders, 
  X, 
  Clock, 
  Eye
} from 'lucide-react';
import { PlanTier } from '../types/dashboard';

export interface SequenceDayStep {
  id: string;
  day: number;
  stage: string;
  channels: ('email' | 'whatsapp' | 'voice')[];
  tone: 'Friendly' | 'Firm' | 'Priority' | 'Urgent' | 'Human Review';
  headline: string;
  copyPreview: string;
  voiceScript?: string;
  triggerRules: string[];
}

export const default21DaySequence: SequenceDayStep[] = [
  {
    id: 'step-1',
    day: 1,
    stage: 'Friendly',
    channels: ['email'],
    tone: 'Friendly',
    headline: 'Due Notice & Razorpay Checkout Link',
    copyPreview: 'Hi {{customer_name}}, this is a reminder that invoice {{invoice_number}} for ₹{{amount}} was due yesterday. Settle securely via UPI/NEFT: {{razorpay_link}}',
    triggerRules: ['Sent post-grace period', 'Stops instantly on Razorpay/bank webhook'],
  },
  {
    id: 'step-3',
    day: 3,
    stage: 'Friendly',
    channels: ['whatsapp'],
    tone: 'Friendly',
    headline: 'WhatsApp Quick-Touch',
    copyPreview: 'Namaste {{customer_name}}, invoice {{invoice_number}} (₹{{amount}}) is 3 days overdue. Tap here to pay via UPI/Cards: {{razorpay_link}}. Reply "PAID" to hold.',
    triggerRules: ['WhatsApp opt-in verified', '"PAID" reply triggers 3-day verification hold'],
  },
  {
    id: 'step-5',
    day: 5,
    stage: 'Friendly',
    channels: ['email'],
    tone: 'Friendly',
    headline: 'GST Statement & Reconciliation Check-in',
    copyPreview: 'Dear {{customer_name}}, attached is GST invoice {{invoice_number}}. Please confirm if this is awaiting ERP approval so we can assist.',
    triggerRules: ['Includes GSTIN & PO reference', 'Debtor questions create owner ticket'],
  },
  {
    id: 'step-8',
    day: 8,
    stage: 'Firm',
    channels: ['email', 'whatsapp'],
    tone: 'Firm',
    headline: 'Day 8 (15+ Bucket Entry)',
    copyPreview: 'Invoice {{invoice_number}} (₹{{amount}}) is 8 days overdue. Please remit today via {{razorpay_link}} or upload NEFT/RTGS UTR proof.',
    triggerRules: ['15+ bucket starting point', 'Bank UTR proof upload enabled'],
  },
  {
    id: 'step-10',
    day: 10,
    stage: 'Firm',
    channels: ['whatsapp'],
    tone: 'Firm',
    headline: 'Instalment Offer',
    copyPreview: 'Hi {{customer_name}}, if full settlement is difficult this week, would a two-part NEFT instalment assist? Reply to confirm dates.',
    triggerRules: ['Date promises captured automatically', 'Pauses until promise date'],
  },
  {
    id: 'step-12',
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
    id: 'step-14',
    day: 14,
    stage: 'Escalation',
    channels: ['email', 'whatsapp'],
    tone: 'Priority',
    headline: 'Credit Terms Review Notice',
    copyPreview: 'Notice: Invoice {{invoice_number}} (₹{{amount}}) is 14 days overdue. Unsettled balance may impact commercial credit terms.',
    triggerRules: ['Dashboard alert triggered', 'Factual and verified details only'],
  },
  {
    id: 'step-17',
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
    id: 'step-19',
    day: 19,
    stage: 'Final Blitz',
    channels: ['voice', 'whatsapp'],
    tone: 'Urgent',
    headline: 'Executive Escalation Notice',
    copyPreview: 'Notice: 48 hours remaining before autonomous cadence concludes and moves to owner review. Pay now: {{razorpay_link}}',
    voiceScript: 'Outstanding balance of ₹{{amount}} under invoice {{invoice_number}} will conclude autonomous sequence in 48 hours.',
    triggerRules: ['1 touch per channel per day limit', 'Audit ledger logs call'],
  },
  {
    id: 'step-21',
    day: 21,
    stage: 'Final Blitz',
    channels: ['voice', 'whatsapp', 'email'],
    tone: 'Urgent',
    headline: 'Day 21: Sequence Concludes',
    copyPreview: 'FINAL NOTICE: 21-day autonomous cycle completes today. Outstanding: ₹{{amount}}. Unsettled accounts move to Human Approval review.',
    voiceScript: 'Final automated notification. 21-day recovery sequence is concluding. Please remit via {{razorpay_link}}.',
    triggerRules: ['Autonomous sequence concludes', 'Moves to Approvals tab for Human Approval'],
  },
  {
    id: 'step-22',
    day: 22,
    stage: 'Human Review',
    channels: ['email'],
    tone: 'Human Review',
    headline: 'Day 22: Human Approval Required',
    copyPreview: 'Autonomous outreach halts. The invoice moves directly to the Approvals tab with "Overdue 22 Days Over" for human review and approval.',
    triggerRules: ['Human approval required', 'Outreach paused until human approval granted'],
  },
];

const STORAGE_KEY_CUSTOM_SEQUENCE = 'recovr_custom_sequence';
const STORAGE_KEY_TOTAL_DAYS = 'recovr_sequence_total_days';

interface SequenceEngineBlockProps {
  planTier: PlanTier;
  onUpgradePrompt: (tier: PlanTier) => void;
}

export const SequenceEngineBlock: React.FC<SequenceEngineBlockProps> = ({
  planTier,
  onUpgradePrompt,
}) => {
  // Configurable sequence steps
  const [sequence, setSequence] = useState<SequenceDayStep[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_SEQUENCE);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse sequence', e);
    }
    return default21DaySequence;
  });

  // Configurable total days
  const [totalDays, setTotalDays] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TOTAL_DAYS);
      if (stored) return Math.max(1, Number(stored) || 21);
    } catch (e) {}
    return 21;
  });

  const [activeStepId, setActiveStepId] = useState<string>(() => {
    return sequence[0]?.id || 'step-1';
  });

  // Editor Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  // Form states inside modal
  const [formDay, setFormDay] = useState<number>(1);
  const [formStage, setFormStage] = useState<string>('Friendly');
  const [formTone, setFormTone] = useState<SequenceDayStep['tone']>('Friendly');
  const [formChannels, setFormChannels] = useState<('email' | 'whatsapp' | 'voice')[]>(['email']);
  const [formHeadline, setFormHeadline] = useState<string>('');
  const [formCopy, setFormCopy] = useState<string>('');
  const [formVoiceScript, setFormVoiceScript] = useState<string>('');
  const [formRules, setFormRules] = useState<string[]>([]);
  const [newRuleInput, setNewRuleInput] = useState<string>('');
  const [showLivePreview, setShowLivePreview] = useState<boolean>(false);

  // Active selected step in the inspector
  const activeStep = sequence.find((s) => s.id === activeStepId) || sequence[0] || default21DaySequence[0];

  // Persist helper
  const persistSequence = (newSteps: SequenceDayStep[], days: number = totalDays) => {
    const sorted = [...newSteps].sort((a, b) => a.day - b.day);
    setSequence(sorted);
    setTotalDays(days);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_SEQUENCE, JSON.stringify(sorted));
      localStorage.setItem(STORAGE_KEY_TOTAL_DAYS, String(days));
    } catch (e) {
      console.warn('Storage save notice', e);
    }
  };

  // Open modal to create new step
  const handleOpenCreateStep = () => {
    setModalMode('create');
    setEditingStepId(null);
    const highestDay = sequence.reduce((max, s) => Math.max(max, s.day), 0);
    setFormDay(Math.min(totalDays, highestDay > 0 ? highestDay + 1 : 1));
    setFormStage('Friendly');
    setFormTone('Friendly');
    setFormChannels(['email']);
    setFormHeadline('Payment Reminder Notice');
    setFormCopy('Hi {{customer_name}}, this is a follow-up regarding invoice {{invoice_number}} for ₹{{amount}}. Please remit via {{razorpay_link}}.');
    setFormVoiceScript('');
    setFormRules(['Sent post-grace period', 'Stops on webhook verification']);
    setNewRuleInput('');
    setShowLivePreview(false);
    setIsModalOpen(true);
  };

  // Open modal to edit existing step
  const handleOpenEditStep = (step: SequenceDayStep) => {
    setModalMode('edit');
    setEditingStepId(step.id);
    setFormDay(step.day);
    setFormStage(step.stage);
    setFormTone(step.tone);
    setFormChannels(step.channels);
    setFormHeadline(step.headline);
    setFormCopy(step.copyPreview);
    setFormVoiceScript(step.voiceScript || '');
    setFormRules([...step.triggerRules]);
    setNewRuleInput('');
    setShowLivePreview(false);
    setIsModalOpen(true);
  };

  // Channel toggle inside modal
  const handleToggleChannel = (ch: 'email' | 'whatsapp' | 'voice') => {
    if (formChannels.includes(ch)) {
      if (formChannels.length === 1) return; // Keep at least 1 channel
      setFormChannels(formChannels.filter((c) => c !== ch));
    } else {
      setFormChannels([...formChannels, ch]);
    }
  };

  // Add trigger rule
  const handleAddRule = () => {
    if (newRuleInput.trim() && !formRules.includes(newRuleInput.trim())) {
      setFormRules([...formRules, newRuleInput.trim()]);
      setNewRuleInput('');
    }
  };

  // Remove trigger rule
  const handleRemoveRule = (index: number) => {
    setFormRules(formRules.filter((_, i) => i !== index));
  };

  // Insert variable into message copy
  const handleInsertVariable = (variable: string) => {
    setFormCopy((prev) => `${prev} {{${variable}}}`);
  };

  // Save Step (create or edit)
  const handleSaveStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'create') {
      const newStep: SequenceDayStep = {
        id: `step-${Date.now()}`,
        day: Number(formDay),
        stage: formStage.trim() || 'Friendly',
        tone: formTone,
        channels: formChannels,
        headline: formHeadline.trim() || 'Payment Notice',
        copyPreview: formCopy.trim(),
        voiceScript: formChannels.includes('voice') ? formVoiceScript.trim() : undefined,
        triggerRules: formRules.length > 0 ? formRules : ['Sent post-grace period'],
      };
      const updated = [...sequence, newStep];
      persistSequence(updated);
      setActiveStepId(newStep.id);
    } else if (editingStepId) {
      const updated = sequence.map((step) =>
        step.id === editingStepId
          ? {
              ...step,
              day: Number(formDay),
              stage: formStage.trim() || step.stage,
              tone: formTone,
              channels: formChannels,
              headline: formHeadline.trim() || step.headline,
              copyPreview: formCopy.trim(),
              voiceScript: formChannels.includes('voice') ? formVoiceScript.trim() : undefined,
              triggerRules: formRules,
            }
          : step
      );
      persistSequence(updated);
      setActiveStepId(editingStepId);
    }
    setIsModalOpen(false);
  };

  // Delete Step
  const handleDeleteStep = (id: string) => {
    if (sequence.length <= 1) {
      alert('The sequence must contain at least one step.');
      return;
    }
    const remaining = sequence.filter((s) => s.id !== id);
    persistSequence(remaining);
    setActiveStepId(remaining[0]?.id || '');
    if (isModalOpen && editingStepId === id) {
      setIsModalOpen(false);
    }
  };

  // Reset to default
  const handleResetDefaults = () => {
    if (window.confirm('Reset sequence back to the default 21-Day cadence?')) {
      persistSequence(default21DaySequence, 21);
      setActiveStepId(default21DaySequence[0].id);
    }
  };

  // Change total duration days
  const handleDurationChange = (newDays: number) => {
    const validDays = Math.max(1, Math.min(180, newDays));
    setTotalDays(validDays);
    persistSequence(sequence, validDays);
  };

  // Live variable sample render
  const renderSamplePreview = (text: string) => {
    return text
      .replace(/{{customer_name}}/g, 'Nexora Infotech Pvt Ltd')
      .replace(/{{invoice_number}}/g, 'INV-2024-884')
      .replace(/{{amount}}/g, '2,40,000')
      .replace(/{{due_date}}/g, 'Nov 15, 2026')
      .replace(/{{razorpay_link}}/g, 'https://rzp.io/l/scalepods-recovr')
      .replace(/{{company_name}}/g, 'ScalePods Inc');
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Developer Sequence Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Sequence Engine Customizer
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-semibold uppercase">
              Developer Mode
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Customize cadence length, configure touchpoint steps, and edit message templates.
          </p>
        </div>

        {/* Global Sequence Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Duration Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">Duration:</span>
            <input
              type="number"
              min="1"
              max="90"
              value={totalDays}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              className="w-12 px-1.5 py-0.5 text-center font-mono font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-white focus:outline-none"
            />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Days</span>
          </div>

          {/* Quick Duration Presets */}
          <div className="hidden sm:flex items-center gap-1">
            {[14, 21, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDurationChange(d)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  totalDays === d
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800'
                }`}
                title={`Set to ${d} Days`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Add Step Button */}
          <button
            onClick={handleOpenCreateStep}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step</span>
          </button>

          {/* Reset Defaults */}
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
            title="Reset to Default 21-Day Sequence"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Sequence Timeline & Stepper Card */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
              Sequence Steps
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {sequence.length} touchpoints configured
            </span>
          </div>

          <div className="text-xs text-zinc-400 font-mono">
            Cadence span: Day 1 → Day {totalDays}
          </div>
        </div>

        {/* Stepper Buttons Carousel / Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {sequence.map((step) => {
            const isCurrent = step.id === activeStep.id;
            const isFinal = step.day >= totalDays;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                className={`flex-shrink-0 min-w-[105px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-500/30'
                    : isFinal
                    ? 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono font-bold mb-1">
                  <span className={isCurrent ? 'text-indigo-600 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400'}>
                    DAY {step.day}
                  </span>
                  <div className="flex items-center gap-1">
                    {step.channels.includes('email') && <Mail className="w-2.5 h-2.5 opacity-80" />}
                    {step.channels.includes('whatsapp') && <MessageSquare className="w-2.5 h-2.5 opacity-80" />}
                    {step.channels.includes('voice') && <PhoneCall className="w-2.5 h-2.5 opacity-80" />}
                  </div>
                </div>

                <div className="text-xs font-semibold truncate leading-snug">
                  {step.stage}
                </div>

                <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {step.tone}
                </div>
              </button>
            );
          })}

          {/* Quick + Add Step button inside the stepper */}
          <button
            type="button"
            onClick={handleOpenCreateStep}
            className="flex-shrink-0 w-24 p-2.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-transparent flex flex-col items-center justify-center text-zinc-400 hover:text-indigo-500 transition-colors cursor-pointer"
            title="Add New Step"
          >
            <Plus className="w-4 h-4 mb-1" />
            <span className="text-[11px] font-medium">+ Step</span>
          </button>
        </div>

        {/* Selected Step Detail & Inspector Panel */}
        {activeStep && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#0E0F16] p-5 space-y-4">
            {/* Header of Inspector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                  DAY {activeStep.day}
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  {activeStep.headline}
                </span>
                <span className="text-xs text-zinc-400">•</span>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Stage: {activeStep.stage}
                </span>
                <span className="text-xs text-zinc-400">•</span>
                <span className="text-xs text-zinc-500 font-mono">
                  Tone: {activeStep.tone}
                </span>
              </div>

              {/* Action Buttons for Step */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditStep(activeStep)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Step</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteStep(activeStep.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Delete Step"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Template Copy & Preview */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Message Copy Template</span>
                  <div className="flex items-center gap-1">
                    {activeStep.channels.map((ch) => (
                      <span key={ch} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 uppercase">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-mono leading-relaxed select-text shadow-xs">
                {activeStep.copyPreview}
              </div>

              {activeStep.voiceScript && (
                <div className="p-3.5 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 text-xs text-zinc-800 dark:text-zinc-200">
                  <div className="text-[10px] font-mono uppercase text-indigo-600 dark:text-indigo-400 font-bold mb-1 flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" />
                    <span>Voice AI Call Dialogue (9:00 AM – 7:00 PM IST):</span>
                  </div>
                  <p className="italic font-serif leading-relaxed text-zinc-700 dark:text-zinc-300">
                    "{activeStep.voiceScript}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STEP EDITOR MODAL (Full customization for Days, Sequence, & Messages)    */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#101118] shadow-2xl overflow-hidden p-6 text-zinc-900 dark:text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                    {modalMode === 'create' ? 'Add Sequence Step' : `Edit Step — Day ${formDay}`}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Configure schedule timing, channels, and message copy.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStep} className="space-y-4">
              {/* Row 1: Day Number, Stage, Tone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Day Number */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Day in Sequence <span className="text-indigo-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    required
                    value={formDay}
                    onChange={(e) => setFormDay(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Stage Name
                  </label>
                  <select
                    value={formStage}
                    onChange={(e) => setFormStage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Friendly">Friendly</option>
                    <option value="Firm">Firm</option>
                    <option value="Escalation">Escalation</option>
                    <option value="Final Blitz">Final Blitz</option>
                    <option value="Human Review">Human Review</option>
                  </select>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tone
                  </label>
                  <select
                    value={formTone}
                    onChange={(e) => setFormTone(e.target.value as SequenceDayStep['tone'])}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Friendly">Friendly</option>
                    <option value="Firm">Firm</option>
                    <option value="Priority">Priority</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Human Review">Human Review</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Channel Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Channels Activated for this Step
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleToggleChannel('email')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formChannels.includes('email')
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleChannel('whatsapp')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formChannels.includes('whatsapp')
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleChannel('voice')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formChannels.includes('voice')
                        ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Voice AI</span>
                  </button>
                </div>
              </div>

              {/* Row 3: Headline / Subject */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Subject / Touchpoint Headline <span className="text-indigo-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payment Reminder Notice & UPI Link"
                  value={formHeadline}
                  onChange={(e) => setFormHeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Row 4: Message Template Copy with Variable Chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Message Template Copy <span className="text-indigo-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showLivePreview ? 'Edit Template' : 'Live Sample Preview'}</span>
                  </button>
                </div>

                {showLivePreview ? (
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-indigo-500/30 text-xs text-zinc-800 dark:text-zinc-200 font-mono leading-relaxed min-h-[90px]">
                    {renderSamplePreview(formCopy)}
                  </div>
                ) : (
                  <textarea
                    rows={4}
                    required
                    value={formCopy}
                    onChange={(e) => setFormCopy(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                )}

                {/* Variable Pills */}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-zinc-400 font-medium">Insert variable:</span>
                  {[
                    'customer_name',
                    'invoice_number',
                    'amount',
                    'due_date',
                    'razorpay_link',
                    'company_name',
                  ].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariable(v)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 transition-colors cursor-pointer"
                    >
                      +{`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 5: Voice AI Script (if Voice is selected) */}
              {formChannels.includes('voice') && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Voice AI Caller Dialogue Script
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter dialogue script for the automated voice agent..."
                    value={formVoiceScript}
                    onChange={(e) => setFormVoiceScript(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-serif italic text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                {modalMode === 'edit' && editingStepId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteStep(editingStepId)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Step</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all cursor-pointer"
                  >
                    {modalMode === 'create' ? 'Add Step to Sequence' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
