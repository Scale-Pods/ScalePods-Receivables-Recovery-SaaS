import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  CheckCircle2, 
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount, PlanTierType } from '../types/auth';
import { signUpUser, signInUser, isSupabaseConfigured } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signup' | 'signin';
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signup',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signup' | 'signin'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or initialize on open
  React.useEffect(() => {
    setMode(initialMode);
    setErrorMsg('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  // Handle Logo Upload via FileReader -> Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setCompanyLogo(event.target.result);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyLogo('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Handler using Supabase Auth (with bcrypt password encryption)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'signup') {
      if (!name.trim() || !email.trim() || !password || !companyName.trim()) {
        setErrorMsg('Please fill in all required fields.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }

      setIsSubmitting(true);

      const { account, error } = await signUpUser({
        email: email.trim().toLowerCase(),
        password,
        fullName: name.trim(),
        companyName: companyName.trim(),
        companyLogo: companyLogo || null,
      });

      setIsSubmitting(false);

      if (error || !account) {
        setErrorMsg(error || 'Failed to sign up.');
        return;
      }

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      onSuccess(account);
      onClose();

    } else {
      // Sign In mode
      if (!email.trim() || !password) {
        setErrorMsg('Please enter both email and password.');
        return;
      }

      setIsSubmitting(true);

      const { account, error } = await signInUser({
        email: email.trim().toLowerCase(),
        password,
      });

      setIsSubmitting(false);

      if (error || !account) {
        setErrorMsg(error || 'Invalid email or password.');
        return;
      }

      onSuccess(account);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md glass-card rounded-2xl border border-purple-500/30 p-6 sm:p-7 text-white shadow-2xl relative overflow-hidden bg-[#0C0D18]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Neon Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
          aria-label="Close auth modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <img
              src="/scalepods-logo-white.png"
              alt="ScalePods"
              className="h-5 w-auto object-contain"
            />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'signup' ? 'Create Account' : 'Log In'}
          </h2>
        </div>

        {/* Tab Switcher: Create Account vs Log In */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-900/80 border border-zinc-800 mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMsg(''); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'signup' && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Full Name <span className="text-purple-400">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Marcus Sterling"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Company Name <span className="text-purple-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Sterling Global Logistics"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
              </div>

              {/* Company Logo Upload with Live Preview */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Company Logo <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                {companyLogo ? (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/80 border border-purple-500/30">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={companyLogo} 
                        alt="Company Logo Preview" 
                        className="w-9 h-9 rounded-lg object-contain bg-black/40 border border-zinc-700 p-0.5"
                      />
                      <div className="text-[11px] font-mono text-zinc-300">
                        <span>Logo attached</span>
                        <span className="block text-[10px] text-emerald-400 font-semibold">✓ Ready to display</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-xs text-zinc-400 hover:text-rose-400 px-2 py-1 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-zinc-700 hover:border-purple-500/60 bg-zinc-900/40 text-xs text-zinc-400 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer group"
                  >
                    <Upload className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                    <span>Click to upload logo (PNG, JPG, SVG)</span>
                  </button>
                )}
              </div>
            </>
          )}

          {/* Work Email */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Work Email <span className="text-purple-400">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                placeholder="marcus@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Password <span className="text-purple-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Default Free Tier Reminder Badge */}
          {mode === 'signup' && (
            <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Assigned Plan: <strong className="text-white">Free Tier</strong></span>
              </div>
              <span className="text-emerald-400 font-bold">₹0 / month</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{mode === 'signup' ? 'Creating Account...' : 'Logging In...'}</span>
              </>
            ) : (
              <span>
                {mode === 'signup' 
                  ? 'Create Account' 
                  : 'Log In'}
              </span>
            )}
          </button>

          {/* Quick Switch Link between Create Account & Log In */}
          <div className="pt-2 text-center text-xs text-zinc-400">
            {mode === 'signup' ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setErrorMsg(''); }}
                  className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline underline-offset-2 ml-1"
                >
                  Log In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMsg(''); }}
                  className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer underline underline-offset-2 ml-1"
                >
                  Create Account
                </button>
              </span>
            )}
          </div>

        </form>

      </div>
    </div>
  );
};
