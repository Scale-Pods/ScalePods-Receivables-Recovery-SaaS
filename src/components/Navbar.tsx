import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, LogOut, Sparkles, Building2, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { navigationLinks } from '../data/landingData';
import { UserAccount } from '../types/auth';

interface NavbarProps {
  currentUser: UserAccount | null;
  onOpenAuth: (mode?: 'signup' | 'signin') => void;
  onSignOut: () => void;
  onOpenUpgrade: () => void;
  onSwitchToDashboard?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onSignOut,
  onOpenUpgrade,
  onSwitchToDashboard,
  isDark = true,
  onToggleTheme,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open to prevent landing page bleed-through
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Compute initials for fallback logo
  const getInitials = (company: string) => {
    return company
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CO';
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-[72px] flex items-center ${
        isScrolled || mobileMenuOpen
          ? 'bg-white dark:bg-[#07080E] border-b border-slate-200/90 dark:border-zinc-800/90 shadow-md shadow-purple-900/5 dark:shadow-black/40'
          : 'bg-transparent border-b border-slate-200/40 dark:border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        
        {/* Brand Logo - ScalePods */}
        <a href="#" className="flex items-center group cursor-pointer select-none">
          <img
            src={isDark ? '/scalepods-logo-white.png' : '/scalepods-logo-dark.png'}
            alt="ScalePods"
            className="h-6 w-auto object-contain transition-opacity group-hover:opacity-90"
          />
        </a>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-7">
          {navigationLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-xs lg:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-white transition-colors relative group py-1"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 group-hover:w-full transition-all duration-200" />
            </a>
          ))}
        </div>

        {/* Action / User Account Area */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Light / Dark Mode Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors border border-slate-200 dark:border-zinc-800"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-600" />}
            </button>
          )}

          {currentUser ? (
            /* Logged-In User Profile Pill */
            <div className="flex items-center gap-2.5">
              
              {/* Account Capsule */}
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 hover:border-purple-500/40 transition-all shadow-sm"
              >
                {/* Company Logo Image or Initials Avatar */}
                {currentUser.companyLogo ? (
                  <img
                    src={currentUser.companyLogo}
                    alt={currentUser.companyName}
                    className="w-6 h-6 rounded-md object-contain bg-white dark:bg-black/50 border border-slate-200 dark:border-zinc-700/60 p-0.5"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center border border-purple-200 dark:border-purple-500/30 font-mono">
                    {getInitials(currentUser.companyName)}
                  </div>
                )}

                {/* Company & Tier Details */}
                <div className="text-left">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white leading-tight max-w-[130px] truncate">
                    {currentUser.companyName}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 capitalize font-bold">
                      {currentUser.planTier}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono hidden lg:inline truncate max-w-[90px]">
                      {currentUser.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Go To Dashboard Button */}
              {onSwitchToDashboard && (
                <button
                  onClick={onSwitchToDashboard}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-purple-600/35 border border-purple-400/40 transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.02]"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-purple-200" />
                  <span>Go to Dashboard →</span>
                </button>
              )}

              {/* Upgrade Tier Button */}
              <button
                onClick={onOpenUpgrade}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Upgrade</span>
              </button>

              {/* Sign Out Button */}
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>
          ) : (
            /* Logged-Out Guest Actions: Log In & Create Account */
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onOpenAuth('signin')}
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-white px-4 py-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer whitespace-nowrap"
              >
                Log In
              </button>
              
              <button
                onClick={() => onOpenAuth('signup')}
                className="relative group overflow-hidden px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-[0_2px_16px_rgba(124,58,237,0.35)] transition-all duration-200 cursor-pointer flex items-center gap-2 whitespace-nowrap"
              >
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-600" />}
            </button>
          )}

          {currentUser ? (
            <button
              onClick={onOpenUpgrade}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-recovr-button capitalize"
            >
              {currentUser.planTier}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-purple-600 dark:hover:text-white border border-slate-200 dark:border-zinc-800"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-recovr-button whitespace-nowrap"
              >
                Create Account
              </button>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer (100% Solid Opaque Full-Screen Viewport) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[72px] bottom-0 z-50 bg-[#F8F9FD] dark:bg-[#07080E] overflow-y-auto px-6 py-6 border-t border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between animate-in fade-in duration-200">
          <div className="flex flex-col space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pb-2">
              Navigation
            </div>
            {navigationLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-semibold text-zinc-900 dark:text-zinc-100 hover:text-purple-600 dark:hover:text-purple-400 py-3 border-b border-slate-200/60 dark:border-zinc-800/60 transition-colors flex items-center justify-between"
              >
                <span>{link.label}</span>
                <span className="text-zinc-400 text-xs font-mono">→</span>
              </a>
            ))}
          </div>

          <div className="pt-6 pb-4 flex flex-col gap-3">
            {currentUser ? (
              <>
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-xs space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white truncate max-w-[200px]">
                      {currentUser.companyName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 capitalize font-bold">
                      {currentUser.planTier} Plan
                    </span>
                  </div>
                  <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                    {currentUser.name} {currentUser.email ? `• ${currentUser.email}` : ''}
                  </div>
                </div>

                {onSwitchToDashboard && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSwitchToDashboard();
                    }}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-purple-600/30 text-center flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Go to Dashboard</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenUpgrade();
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-800 dark:text-white bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-center border border-slate-200 dark:border-zinc-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Upgrade</span>
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-slate-200 dark:border-zinc-800 text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer bg-white dark:bg-zinc-900 shadow-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:text-purple-600 dark:hover:text-white border border-slate-200 dark:border-zinc-800 text-center bg-white dark:bg-zinc-900 shadow-xs"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 text-center shadow-md shadow-purple-600/30"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
