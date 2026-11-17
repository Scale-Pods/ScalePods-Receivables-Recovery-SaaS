import React, { useState } from 'react';
import { 
  Mail, 
  MessageSquare, 
  PhoneCall, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Check, 
  Sliders, 
  X, 
  Clock,
  Save,
  Loader2
} from 'lucide-react';
import { PlanTier } from '../types/dashboard';
import { UserAccount } from '../../types/auth';
import { sendSequenceCustomizationWebhook } from '../../lib/webhook';

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

const getDefaultCopyForTone = (tone: SequenceDayStep['tone']): string => {
  switch (tone) {
    case 'Friendly':
      return 'Hi {{customer_name}}, this is a gentle reminder that invoice {{invoice_number}} for ₹{{amount}} is due on {{due_date}}. Please remit via {{razorpay_link}}. Thank you!';
    case 'Firm':
      return 'Notice: Invoice {{invoice_number}} for ₹{{amount}} was due on {{due_date}} and remains unsettled. Remit today via {{razorpay_link}}.';
    case 'Priority':
      return 'Priority Notice: Invoice {{invoice_number}} (₹{{amount}}) is significantly overdue. Unsettled balance may impact commercial credit terms. Pay now: {{razorpay_link}}';
    case 'Urgent':
      return 'URGENT: Invoice {{invoice_number}} (₹{{amount}}) is past due. Daily outreach active. Remit via UPI / NetBanking: {{razorpay_link}}.';
    case 'Human Review':
      return 'Autonomous recovery cycle concludes. Invoice moved to internal executive review pending human approval.';
    default:
      return 'Payment notice for invoice {{invoice_number}} (₹{{amount}}). Remit via {{razorpay_link}}.';
  }
};

const getDefaultVoiceScriptForTone = (tone: SequenceDayStep['tone']): string => {
  switch (tone) {
    case 'Friendly':
      return 'Namaste, this is an automated follow-up regarding invoice {{invoice_number}} for ₹{{amount}}. May I confirm if payment is scheduled?';
    case 'Firm':
      return 'Hello, calling regarding overdue invoice {{invoice_number}} for ₹{{amount}}. Please complete settlement via the link sent to your registered contact.';
    case 'Priority':
      return 'Namaste, this is the accounts assistant regarding overdue invoice {{invoice_number}} for ₹{{amount}}. May I confirm if payment is being processed today?';
    case 'Urgent':
      return 'Urgent escalation notice for invoice {{invoice_number}} with an outstanding balance of ₹{{amount}}. Please remit immediately today.';
    default:
      return '';
  }
};

const getStageForTone = (tone: SequenceDayStep['tone']): string => {
  switch (tone) {
    case 'Friendly':
      return 'Friendly';
    case 'Firm':
      return 'Firm';
    case 'Priority':
      return 'Escalation';
    case 'Urgent':
      return 'Final Blitz';
    case 'Human Review':
      return 'Human Review';
    default:
      return 'Friendly';
  }
};

const getHeadlineForTone = (tone: SequenceDayStep['tone'], day: number): string => {
  switch (tone) {
    case 'Friendly':
      return `Day ${day}: Friendly Reminder`;
    case 'Firm':
      return `Day ${day}: Overdue Notice`;
    case 'Priority':
      return `Day ${day}: Priority Escalation`;
    case 'Urgent':
      return `Day ${day}: Final Blitz Notice`;
    case 'Human Review':
      return `Day ${day}: Human Review Required`;
    default:
      return `Day ${day}: Payment Notice`;
  }
};

interface SequenceEngineBlockProps {
  planTier: PlanTier;
  onUpgradePrompt: (tier: PlanTier) => void;
  currentUser?: UserAccount | null;
}

export const SequenceEngineBlock: React.FC<SequenceEngineBlockProps> = ({
  planTier,
  onUpgradePrompt,
  currentUser,
}) => {
  // Resolve logged-in user id & customer_uid
  const loggedInCustomerUid =
    currentUser?.customer_uid ||
    currentUser?.uid ||
    (() => {
      try {
        const stored = localStorage.getItem('recovr_user_account');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.customer_uid || parsed.uid;
        }
      } catch {}
      return undefined;
    })();

  const loggedInUserId =
    loggedInCustomerUid ||
    currentUser?.id ||
    currentUser?.email ||
    (() => {
      try {
        const stored = localStorage.getItem('recovr_user_account');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.id || parsed.email || 'user-client';
        }
      } catch {}
      return 'user-client';
    })();

  const userSequenceKey = `recovr_custom_sequence_${loggedInUserId}`;
  const userDaysKey = `recovr_sequence_total_days_${loggedInUserId}`;

  // Configurable sequence steps
  const [sequence, setSequence] = useState<SequenceDayStep[]>(() => {
    try {
      const userStored = localStorage.getItem(userSequenceKey);
      if (userStored) {
        const parsed = JSON.parse(userStored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
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
      const userStored = localStorage.getItem(userDaysKey);
      if (userStored) return Math.max(1, Number(userStored) || 21);
      const stored = localStorage.getItem(STORAGE_KEY_TOTAL_DAYS);
      if (stored) return Math.max(1, Number(stored) || 21);
    } catch (e) {}
    return 21;
  });

  const [activeStepId, setActiveStepId] = useState<string>(() => {
    return sequence[0]?.id || 'step-1';
  });

  // Save & Sync states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

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
      localStorage.setItem(userSequenceKey, JSON.stringify(sorted));
      localStorage.setItem(userDaysKey, String(days));
    } catch (e) {
      console.warn('Storage save notice', e);
    }
  };

  // Save custom sequence and dispatch to webhook with logged-in user id
  const handleSaveAndSyncSequence = async () => {
    setIsSaving(true);
    setSyncStatusMessage(null);
    setSaveSuccess(false);

    // Save locally
    persistSequence(sequence, totalDays);

    try {
      await sendSequenceCustomizationWebhook({
        userId: loggedInUserId,
        customer_uid: loggedInCustomerUid || loggedInUserId,
        customerUid: loggedInCustomerUid || loggedInUserId,
        userEmail: currentUser?.email || '',
        userName: currentUser?.name || '',
        userCompany: currentUser?.companyName || '',
        planTier: planTier,
        billingCycle: currentUser?.billingCycle || 'monthly',
        totalDays: totalDays,
        stepsCount: sequence.length,
        sequence: sequence.map((s) => ({
          id: s.id,
          day: s.day,
          stage: s.stage,
          tone: s.tone,
          channels: s.channels,
          headline: s.headline,
          triggerRules: s.triggerRules,
        })),
        status: 'active_cadence_saved',
        timestamp: new Date().toISOString(),
      });

      setSaveSuccess(true);
      setSyncStatusMessage('Custom sequence saved and synced to automation webhook.');
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
      setTimeout(() => {
        setSyncStatusMessage(null);
      }, 6000);
    } catch (err) {
      console.warn('Webhook dispatch notification notice:', err);
      setSaveSuccess(true);
      setSyncStatusMessage('Sequence saved locally.');
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
      setTimeout(() => {
        setSyncStatusMessage(null);
      }, 6000);
    } finally {
      setIsSaving(false);
    }
  };

  // Open modal to create new step
  const handleOpenCreateStep = () => {
    setModalMode('create');
    setEditingStepId(null);
    const highestDay = sequence.reduce((max, s) => Math.max(max, s.day), 0);
    const nextDay = Math.min(totalDays, highestDay > 0 ? highestDay + 1 : 1);
    setFormDay(nextDay);
    setFormStage(getStageForTone('Friendly'));
    setFormTone('Friendly');
    setFormChannels(['email']);
    setFormHeadline(getHeadlineForTone('Friendly', nextDay));
    setFormCopy(getDefaultCopyForTone('Friendly'));
    setFormVoiceScript(getDefaultVoiceScriptForTone('Friendly'));
    setFormRules(['Sent post-grace period', 'Stops on webhook verification']);
    setNewRuleInput('');
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
    setIsModalOpen(true);
  };

  // Handle tone change
  const handleToneChange = (tone: SequenceDayStep['tone']) => {
    setFormTone(tone);
    setFormStage(getStageForTone(tone));
    setFormHeadline(getHeadlineForTone(tone, formDay));
    if (modalMode === 'create') {
      setFormCopy(getDefaultCopyForTone(tone));
      setFormVoiceScript(getDefaultVoiceScriptForTone(tone));
    }
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

  // Save Step (create or edit)
  const handleSaveStep = (e: React.FormEvent) => {
    e.preventDefault();
    const stage = formStage.trim() || getStageForTone(formTone);
    const headline = formHeadline.trim() || getHeadlineForTone(formTone, formDay);

    if (modalMode === 'create') {
      const copy = formCopy.trim() || getDefaultCopyForTone(formTone);
      const voice = formChannels.includes('voice') ? (formVoiceScript.trim() || getDefaultVoiceScriptForTone(formTone)) : undefined;
      const newStep: SequenceDayStep = {
        id: `step-${Date.now()}`,
        day: Number(formDay),
        stage: stage,
        tone: formTone,
        channels: formChannels,
        headline: headline,
        copyPreview: copy,
        voiceScript: voice,
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
              stage: stage,
              tone: formTone,
              channels: formChannels,
              headline: headline,
              copyPreview: step.copyPreview || getDefaultCopyForTone(formTone),
              voiceScript: formChannels.includes('voice') ? (step.voiceScript || getDefaultVoiceScriptForTone(formTone)) : undefined,
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

  return (
    <div className="space-y-5">
      {/* Top Header & Sequence Cadence Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Sequence Engine Customizer
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-semibold uppercase">
              Cadence Engine
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Customize cadence length, configure touchpoint days, and manage delivery channels.
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

          {/* Save & Sync to Webhook Button */}
          <button
            onClick={handleSaveAndSyncSequence}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 ring-2 ring-emerald-500/50'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            } ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
            title="Save custom sequence and dispatch to webhook with logged-in user id"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving & Syncing...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved & Synced!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Sequence</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMessage && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{syncStatusMessage}</span>
          </div>
          <div className="flex items-center gap-2.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
            <span>Tier: <strong className="uppercase">{planTier}</strong></span>
            <span>•</span>
            <span>Customer UID: <strong className="underline">{loggedInCustomerUid || loggedInUserId}</strong></span>
          </div>
        </div>
      )}

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
                onClick={() => {
                  setActiveStepId(step.id);
                  handleOpenEditStep(step);
                }}
                className={`flex-shrink-0 min-w-[105px] p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-500/30'
                    : isFinal
                    ? 'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 hover:border-rose-400'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400 dark:hover:border-indigo-500/60'
                }`}
                title={`Click to edit Day ${step.day} touchpoint`}
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
          <div 
            onClick={() => handleOpenEditStep(activeStep)}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#0E0F16] hover:border-indigo-400 dark:hover:border-indigo-500/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs cursor-pointer transition-all group"
            title="Click to edit step details"
          >
            {/* Step info */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                DAY {activeStep.day}
              </span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Tone: <span className="font-mono text-indigo-600 dark:text-indigo-400">{activeStep.tone}</span>
              </span>
              <span className="text-xs text-zinc-300 dark:text-zinc-700">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500 font-medium">Channels:</span>
                {activeStep.channels.map((ch) => (
                  <span
                    key={ch}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase"
                  >
                    {ch === 'email' && <Mail className="w-2.5 h-2.5 text-indigo-500" />}
                    {ch === 'whatsapp' && <MessageSquare className="w-2.5 h-2.5 text-emerald-500" />}
                    {ch === 'voice' && <PhoneCall className="w-2.5 h-2.5 text-purple-500" />}
                    <span>{ch}</span>
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic hidden sm:inline ml-1 group-hover:text-indigo-500 transition-colors">
                (Click to customize)
              </span>
            </div>

            {/* Action Buttons for Step */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStep(activeStep.id);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Delete Step"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
                    Configure schedule timing, tone, and delivery channels.
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
              {/* Row 1: Day Number & Tone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setFormDay(d);
                      if (modalMode === 'create') {
                        setFormHeadline(getHeadlineForTone(formTone, d));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Tone / Urgency
                  </label>
                  <select
                    value={formTone}
                    onChange={(e) => handleToneChange(e.target.value as SequenceDayStep['tone'])}
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
