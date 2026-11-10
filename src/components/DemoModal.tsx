import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoModal: React.FC<DemoModalProps> = ({ isOpen, onClose }) => {
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [volume, setVolume] = useState('₹25L - ₹1 Cr');
  const [erp, setErp] = useState('Enterprise ERP');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const handleReset = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg glass-card rounded-2xl border border-purple-500/30 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden bg-[#0C0D16]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <div>
            <div className="mb-6 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-purple-400 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>14-Day Free Enterprise Pilot</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Book a 15-Minute Live Demo
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                Experience the 21-Day Recovery Engine with your own sample ledger.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Singhania"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Work Email (Corporate Domain)
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nexora Infotech Pvt Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Monthly Overdue Debt
                  </label>
                  <select
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="< ₹25 Lakhs">&lt; ₹25 Lakhs</option>
                    <option value="₹25L - ₹1 Cr">₹25L - ₹1 Cr</option>
                    <option value="₹1 Cr - ₹5 Cr">₹1 Cr - ₹5 Cr</option>
                    <option value="> ₹5 Crores">&gt; ₹5 Crores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Accounting / ERP System
                  </label>
                  <select
                    value={erp}
                    onChange={(e) => setErp(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="Enterprise ERP">Enterprise ERP</option>
                    <option value="Zoho Books">Zoho Books</option>
                    <option value="SAP / Oracle">SAP / Oracle</option>
                    <option value="QuickBooks">QuickBooks</option>
                    <option value="Custom / Excel">Custom / Excel</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                <span>Confirm & Access Sandbox</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-[11px] text-zinc-500 font-mono flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>NDA Protected • Zero Spam Guarantee</span>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-white tracking-tight">
              You're Booked, {fullName.split(' ')[0]}!
            </h3>

            <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
              We've dispatched your credentials and a calendar invite to <span className="font-mono text-purple-400 font-semibold">{workEmail}</span>. An executive recovery architect is assigned to your account.
            </p>

            <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 font-mono text-left space-y-1.5 max-w-sm mx-auto">
              <div>🏢 Company: <span className="text-white">{companyName}</span></div>
              <div>⚡ ERP Target: <span className="text-white">{erp}</span></div>
              <div>💰 Volume Track: <span className="text-emerald-400">{volume}</span></div>
            </div>

            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Close & Return to Page
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
