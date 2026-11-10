import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, LogOut, Sparkles, Building2, LayoutDashboard } from 'lucide-react';
import { navigationLinks } from '../data/landingData';
import { UserAccount } from '../types/auth';

interface NavbarProps {
  currentUser: UserAccount | null;
  onOpenAuth: (mode?: 'signup' | 'signin') => void;
  onSignOut: () => void;
  onOpenUpgrade: () => void;
  onSwitchToDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onSignOut,
  onOpenUpgrade,
  onSwitchToDashboard,
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
        isScrolled
          ? 'bg-[#07080D]/90 backdrop-blur-md border-b border-zinc-800/80 shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        
        {/* Brand Logo - ScalePods */}
        <a href="#" className="flex items-center group cursor-pointer select-none">
          <img
            src="/scalepods-logo-white.png"
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
              className="text-xs lg:text-sm font-medium text-zinc-400 hover:text-white transition-colors relative group py-1"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 group-hover:w-full transition-all duration-200" />
            </a>
          ))}
        </div>

        {/* Action / User Account Area */}
        <div className="hidden sm:flex items-center gap-3">
          {currentUser ? (
            /* Logged-In User Profile Pill */
            <div className="flex items-center gap-2.5">
              
              {/* Account Capsule */}
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-purple-500/40 transition-all shadow-sm"
              >
                {/* Company Logo Image or Initials Avatar */}
                {currentUser.companyLogo ? (
                  <img
                    src={currentUser.companyLogo}
                    alt={currentUser.companyName}
                    className="w-6 h-6 rounded-md object-contain bg-black/50 border border-zinc-700/60 p-0.5"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-purple-600/20 text-purple-300 font-bold text-[10px] flex items-center justify-center border border-purple-500/30 font-mono">
                    {getInitials(currentUser.companyName)}
                  </div>
                )}

                {/* Company & Tier Details */}
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight max-w-[130px] truncate">
                    {currentUser.companyName}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 capitalize font-bold">
                      {currentUser.planTier}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono hidden lg:inline truncate max-w-[90px]">
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
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Upgrade</span>
              </button>

              {/* Sign Out Button */}
              <button
                onClick={onSignOut}
                title="Sign Out"
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>
          ) : (
            /* Logged-Out Guest Actions: Log In & Create Account */
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onOpenAuth('signin')}
                className="text-sm font-medium text-zinc-300 hover:text-white px-4 py-2 rounded-xl transition-colors hover:bg-zinc-800/60 cursor-pointer whitespace-nowrap"
              >
                Log In
              </button>
              
              <button
                onClick={() => onOpenAuth('signup')}
                className="relative group overflow-hidden px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-[0_2px_16px_rgba(124,58,237,0.4)] transition-all duration-200 cursor-pointer flex items-center gap-2 whitespace-nowrap"
              >
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          {currentUser ? (
            <button
              onClick={onOpenUpgrade}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 capitalize"
            >
              {currentUser.planTier}
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white border border-zinc-800"
              >
                Log In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 whitespace-nowrap"
              >
                Create Account
              </button>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[70px] left-0 right-0 bg-[#0B0C13]/98 border-b border-zinc-800 px-6 py-6 shadow-2xl space-y-4 backdrop-blur-xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-3">
            {navigationLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-zinc-300 hover:text-white py-2 border-b border-zinc-800/50"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {currentUser ? (
              <>
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                  <div className="font-bold text-white">{currentUser.companyName}</div>
                  <div className="text-zinc-400 font-mono">{currentUser.name} • Tier: <span className="text-purple-300 capitalize">{currentUser.planTier}</span></div>
                </div>
                {onSwitchToDashboard && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSwitchToDashboard();
                    }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-center flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Go to Dashboard</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenUpgrade();
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-zinc-800 text-center"
                >
                  Upgrade Tier
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 text-center"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white border border-zinc-800 text-center"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 text-center"
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
