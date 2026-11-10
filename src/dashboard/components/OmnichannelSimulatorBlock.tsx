import React, { useState } from 'react';
import { 
  MessageSquare, 
  PhoneCall, 
  Mail, 
  Send, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { PlanTier } from '../types/dashboard';

interface OmnichannelSimulatorBlockProps {
  planTier: PlanTier;
  onUpgradePrompt: (tier: PlanTier) => void;
  onActionTriggered?: (actionType: string, description: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'customer';
  text: string;
  timestamp: string;
  tag?: string;
}

export const OmnichannelSimulatorBlock: React.FC<OmnichannelSimulatorBlockProps> = ({
  planTier,
  onUpgradePrompt,
  onActionTriggered,
}) => {
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'voice' | 'email'>('whatsapp');

  // WhatsApp Interactive Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Namaste Rajesh ji. This is Sarah from Accounts. GST Invoice INV-2024-8842 for ₹1,84,000 is 18 days past due. Settle securely via Razorpay UPI / NEFT: https://pay.recovr.io/inv-8842. Reply "PAID" if already remitted.',
      timestamp: '09:14 AM',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Voice Call State
  const [isCalling, setIsCalling] = useState(false);
  const [selectedVoiceTone, setSelectedVoiceTone] = useState<'friendly' | 'firm' | 'urgent'>('urgent');

  // Trigger Debtor Pre-scripted Scenarios
  const handleSimulateCustomerReply = (preset: 'paid' | 'installment' | 'dispute' | 'link') => {
    let customerText = '';
    let aiResponse = '';
    let actionNotice = '';

    if (preset === 'paid') {
      customerText = 'I have already paid this morning by NEFT through HDFC Bank.';
      aiResponse = 'Thank you, Rajesh ji! Reminders are paused for 3 business days while accounts reconciles the bank UTR. Upload remittance slip if handy: https://pay.recovr.io/proof-8842';
      actionNotice = '3-Day Hold Active';
    } else if (preset === 'installment') {
      customerText = 'Can we pay 50% (₹92,000) today via RTGS and clear the remainder next Friday?';
      aiResponse = 'Confirmed. Pay ₹92,000 today via https://pay.razorpay.com/part-8842. Remainder scheduled for Friday, Nov 14th without MSME statutory interest.';
      actionNotice = 'Installment Plan Logged';
    } else if (preset === 'dispute') {
      customerText = 'Disputing line item 3. Milestone delivery capped at 120 hrs, invoice lists 160.';
      aiResponse = 'Dispute ticket #TCK-9402 created. Disputed ₹32,000 is isolated. Would you like to clear the undisputed ₹1,52,000 balance today?';
      actionNotice = 'Dispute Ticket Logged';
    } else {
      customerText = 'Please resend checkout link for corporate card / UPI.';
      aiResponse = 'Here is your link: https://pay.recovr.io/inv-8842 (UPI, NetBanking, NEFT virtual account & Cards supported with instant GST receipt).';
      actionNotice = 'Checkout Link Sent';
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'customer',
      text: customerText,
      timestamp: 'Just now',
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiTyping(true);

    setTimeout(() => {
      setIsAiTyping(false);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponse,
        timestamp: 'Just now',
        tag: actionNotice,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
      if (onActionTriggered) onActionTriggered(preset, actionNotice);
    }, 700);
  };

  const handleSendCustomText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'customer',
      text: userText,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsAiTyping(true);

    setTimeout(() => {
      setIsAiTyping(false);
      let reply = 'Logged your reply. View statement or settle online via Razorpay: https://pay.recovr.io/inv-8842';
      let tag = 'Reply Logged';
      if (userText.toLowerCase().includes('paid') || userText.toLowerCase().includes('transfer') || userText.toLowerCase().includes('neft') || userText.toLowerCase().includes('rtgs')) {
        reply = 'Reminders paused for 3 business days pending bank UTR verification.';
        tag = '3-Day Hold Active';
      } else if (userText.toLowerCase().includes('dispute') || userText.toLowerCase().includes('wrong')) {
        reply = 'Dispute ticket created for owner review. Outreach on disputed portion is paused.';
        tag = 'Dispute Ticket Logged';
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        timestamp: 'Just now',
        tag,
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    }, 700);
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">AI Agent Simulator</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Test conversational debtor interactions across channels.</p>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setActiveChannel('whatsapp')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeChannel === 'whatsapp'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={() => setActiveChannel('voice')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeChannel === 'voice'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Voice AI</span>
          </button>
          <button
            onClick={() => setActiveChannel('email')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeChannel === 'email'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm border border-zinc-200 dark:border-zinc-700'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
        </div>
      </div>

      {/* CHANNEL 1: WHATSAPP INTERACTIVE SIMULATOR */}
      {activeChannel === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chat Window */}
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0D14] overflow-hidden flex flex-col h-[520px] shadow-sm">
              {/* WhatsApp Header */}
              <div className="px-4 py-2.5 bg-zinc-100 dark:bg-[#11131F] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs">
                    RS
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <span>Rajesh Sharma</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                      Nexora Infotech Pvt Ltd • #INV-8842 (₹1,84,000)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold">
                    Active
                  </span>
                  <button 
                    onClick={() => setChatMessages([chatMessages[0]])}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                    title="Reset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-zinc-50/70 dark:bg-[#08090E]">
                {chatMessages.map((msg) => {
                  const isAi = msg.sender === 'ai';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed shadow-sm ${
                          isAi
                            ? 'bg-white dark:bg-[#151724] text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800'
                            : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                        }`}
                      >
                        <div>{msg.text}</div>
                        <div className="text-[9px] text-right mt-1 opacity-60 font-mono">
                          {msg.timestamp}
                        </div>
                      </div>

                      {msg.tag && (
                        <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          <span>{msg.tag}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isAiTyping && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#151724] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 w-fit text-xs shadow-sm">
                    <span className="text-[10px] font-mono">Typing...</span>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendCustomText} className="p-2.5 bg-zinc-100 dark:bg-[#11131F] border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message as debtor..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isAiTyping}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-40 text-xs font-semibold cursor-pointer shadow-sm"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Quick Scenario Buttons */}
          <div className="lg:col-span-4 space-y-3">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-4 space-y-3 shadow-sm">
              <div className="text-xs font-bold text-zinc-900 dark:text-white">Debtor Scenarios</div>
              
              <div className="space-y-2">
                {[
                  { id: 'paid', label: 'Reported Paid', note: 'Activates 3-day hold' },
                  { id: 'installment', label: 'Split 50%', note: 'Logs promise plan' },
                  { id: 'dispute', label: 'Dispute Item', note: 'Creates owner ticket' },
                  { id: 'link', label: 'Resend Link', note: 'Razorpay checkout' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSimulateCustomerReply(s.id as any)}
                    className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F16] hover:border-zinc-400 dark:hover:border-zinc-600 text-left transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white">{s.label}</div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">{s.note}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-4 text-xs space-y-2 text-zinc-600 dark:text-zinc-400 shadow-sm">
              <div className="text-zinc-900 dark:text-white font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Safety Guardrail</span>
              </div>
              <p className="text-[11px] leading-relaxed">Replies never mark an invoice paid. Payment status is updated only via Razorpay webhook or owner verification.</p>
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL 2: AI VOICE CALL SIMULATOR */}
      {activeChannel === 'voice' && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <span>Voice AI Agent (Days 17–21)</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Active only during 9:00 AM – 7:00 PM local customer time.</p>
            </div>

            <div className="flex items-center gap-1.5">
              {(['friendly', 'firm', 'urgent'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedVoiceTone(t)}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-all cursor-pointer ${
                    selectedVoiceTone === t
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Phone Widget */}
            <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0F17] p-5 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center mx-auto shadow-sm">
                <PhoneCall className="w-6 h-6" />
              </div>

              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-white">Rajesh Sharma (CFO)</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">+91 98201 44821</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono mt-1 font-semibold">
                  Connected (00:42)
                </div>
              </div>

              {/* Sound Wave Animation */}
              <div className="flex items-center justify-center gap-1 h-8">
                <div className="w-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-wave-1" />
                <div className="w-1 bg-zinc-600 dark:bg-zinc-400 rounded-full animate-wave-2" />
                <div className="w-1 bg-zinc-800 dark:bg-zinc-200 rounded-full animate-wave-3" />
                <div className="w-1 bg-zinc-600 dark:bg-zinc-400 rounded-full animate-wave-4" />
                <div className="w-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-wave-5" />
              </div>

              <button
                onClick={() => setIsCalling(!isCalling)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 mx-auto transition-all cursor-pointer ${
                  isCalling 
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-300' 
                    : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                }`}
              >
                {isCalling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isCalling ? 'Pause' : 'Play Audio'}</span>
              </button>
            </div>

            {/* Transcript */}
            <div className="lg:col-span-7 space-y-3">
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">Call Transcript:</div>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#08090E] p-3 space-y-2 text-xs">
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800">
                  <strong className="text-zinc-900 dark:text-white font-mono">AI:</strong> "Namaste Rajesh ji, this is Sarah from Accounts regarding GST invoice INV-2024-8842 for ₹1,84,000. Can you confirm if RTGS/NEFT payment is scheduled this week?"
                </div>
                <div className="p-2.5 rounded bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300">
                  <strong className="text-zinc-500 dark:text-zinc-400 font-mono">Debtor:</strong> "We can do a partial RTGS transfer of ₹92,000 today."
                </div>
                <div className="p-2.5 rounded bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-800">
                  <strong className="text-zinc-900 dark:text-white font-mono">AI:</strong> "Sending a Razorpay payment link for ₹92,000 now. Reminders will hold until auditor clearance next week."
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHANNEL 3: EMAIL PREVIEW */}
      {activeChannel === 'email' && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-5 space-y-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-900 dark:text-white">Email Template Preview</div>

          <div className="max-w-xl mx-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white p-5 text-xs space-y-3 shadow-md">
            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <div>
                <div className="font-bold text-zinc-900 dark:text-white">Vivarily Accounts (India)</div>
                <div className="text-zinc-500 text-[10px]">billing@vivarily.in</div>
              </div>
              <div className="text-right text-rose-600 dark:text-rose-400 font-mono text-[10px] font-semibold">
                <div>18 Days Overdue</div>
              </div>
            </div>

            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              GST Invoice <strong>#INV-2024-8842</strong> for <strong>₹1,84,000.00</strong> was due on Oct 15. Tap below to pay via UPI, NetBanking, or Corporate Cards:
            </p>

            <div className="text-center py-2">
              <button className="px-5 py-2 rounded-lg font-bold text-xs text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 shadow-sm cursor-pointer">
                Pay ₹1,84,000.00 via Razorpay
              </button>
            </div>

            <div className="p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400">
              If already paid via NEFT/RTGS, reply with bank UTR number to pause reminders for 3 business days.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
