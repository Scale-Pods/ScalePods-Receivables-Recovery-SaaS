import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ArchitectureSection } from './components/ArchitectureSection';
import { ComparisonTable } from './components/ComparisonTable';
import { PricingSection } from './components/PricingSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { TierPurchaseModal } from './components/TierPurchaseModal';
import { UserAccount, PlanTierType, STORAGE_KEY_USER } from './types/auth';
import { PricingPlan, pricingPlans } from './data/landingData';
import { DashboardView } from './dashboard/App';
import { isDashboardPath } from './dashboard/routes';
import { signOutUser, updatePlanTierInSupabase, isSupabaseConfigured, supabase } from './lib/supabase';
import { OAuthCallbackHandler } from './components/OAuthCallbackHandler';

export function App() {
  // Theme state shared across Landing Page and Dashboard
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const storedTheme = localStorage.getItem('recovr_theme');
      if (storedTheme) return storedTheme === 'dark';
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('recovr_theme', isDark ? 'dark' : 'light');
    } catch {}
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Navigation View: 'landing' (marketing site) | 'dashboard' (Recovery SaaS core system) | 'oauth-callback'
  const [activeView, setActiveView] = useState<'landing' | 'dashboard' | 'oauth-callback'>('landing');

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'signin'>('signup');

  // Tier Purchase state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<PricingPlan | null>(null);
  const [purchaseIsAnnual, setPurchaseIsAnnual] = useState(true);

  // Load user from localStorage or Supabase session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_USER);
      if (stored) {
        const parsed: UserAccount = JSON.parse(stored);
        setCurrentUser(parsed);

        // Auto-upgrade session with customer_uid from Credentials if missing
        if (!parsed.customer_uid && parsed.email && isSupabaseConfigured && supabase) {
          (async () => {
            try {
              const { data } = await supabase
                .from('Credentials')
                .select('uid, id')
                .ilike('Email', parsed.email.trim().toLowerCase())
                .maybeSingle();

              if (data && (data.uid || data.id)) {
                const uidVal = String(data.uid || data.id);
                const upgraded: UserAccount = {
                  ...parsed,
                  customer_uid: uidVal,
                  uid: uidVal,
                };
                setCurrentUser(upgraded);
                try {
                  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(upgraded));
                } catch {}
              }
            } catch (upgradeErr) {
              console.warn('Session upgrade notice:', upgradeErr);
            }
          })();
        }
      }
    } catch (err) {
      console.warn('Failed to parse stored user', err);
    }
  }, []);

  // Synchronize route with URL (supports /upgrade, dashboard page routes, and /)
  useEffect(() => {
    const syncRouteFromUrl = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (path.startsWith('/auth/callback')) {
        setActiveView('oauth-callback');
        setIsPurchaseModalOpen(false);
      } else if (path === '/upgrade' || hash === '#upgrade') {
        setIsPurchaseModalOpen(true);
        // If user session exists, show behind dashboard, else behind landing
        try {
          const stored = localStorage.getItem(STORAGE_KEY_USER);
          if (stored) {
            setActiveView('dashboard');
          }
        } catch {}
      } else if (isDashboardPath(path)) {
        setActiveView('dashboard');
        setIsPurchaseModalOpen(false);
      } else {
        setIsPurchaseModalOpen(false);
      }
    };

    syncRouteFromUrl();
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, []);

  // Auth Handlers
  const handleOpenAuth = (mode: 'signup' | 'signin' = 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setActiveView('landing');
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  };

  // On Login/Signup Success: save user and automatically switch directly to the Dashboard!
  const handleAuthSuccess = (account: UserAccount) => {
    setCurrentUser(account);
    setActiveView('dashboard');
    if (!isDashboardPath(window.location.pathname) && window.location.pathname !== '/upgrade') {
      window.history.pushState({ view: 'dashboard' }, '', '/dashboard');
    }
  };

  // Plan Selection & Purchase Handlers with dedicated /upgrade URL
  const handleSelectPlan = (plan: PricingPlan, isAnnual: boolean) => {
    setSelectedPlanForPurchase(plan);
    setPurchaseIsAnnual(isAnnual);
    setIsPurchaseModalOpen(true);
    if (window.location.pathname !== '/upgrade') {
      window.history.pushState({ view: 'upgrade', plan: plan.id }, '', '/upgrade');
    }
  };

  const handleOpenUpgradeFromNavbar = () => {
    setSelectedPlanForPurchase(null);
    setPurchaseIsAnnual(true);
    setIsPurchaseModalOpen(true);
    if (window.location.pathname !== '/upgrade') {
      window.history.pushState({ view: 'upgrade' }, '', '/upgrade');
    }
  };

  const handleClosePurchaseModal = () => {
    setIsPurchaseModalOpen(false);
    setSelectedPlanForPurchase(null);
    if (window.location.pathname === '/upgrade') {
      const fallbackUrl = activeView === 'dashboard' ? '/dashboard' : '/';
      window.history.pushState({}, '', fallbackUrl);
    }
  };

  const handleSwitchToDashboard = () => {
    setActiveView('dashboard');
    if (!isDashboardPath(window.location.pathname)) {
      window.history.pushState({ view: 'dashboard' }, '', '/dashboard');
    }
  };

  const handleSwitchToLanding = () => {
    setActiveView('landing');
    if (window.location.pathname !== '/') {
      window.history.pushState({ view: 'landing' }, '', '/');
    }
  };

  const handleUpgradeSuccess = async (newTier: PlanTierType, cycle: 'monthly' | 'annual') => {
    if (currentUser) {
      const updated: UserAccount = {
        ...currentUser,
        planTier: newTier,
        billingCycle: cycle,
      };
      setCurrentUser(updated);
      const targetUserId = currentUser.customer_uid || currentUser.uid || currentUser.id || '';
      await updatePlanTierInSupabase(targetUserId, newTier, cycle, currentUser.email, currentUser.customer_uid || currentUser.uid);
    }
  };

  const handleHeroCta = () => {
    if (!currentUser) {
      handleOpenAuth('signup');
    } else {
      setActiveView('dashboard');
    }
  };

  // OAuth Callback Route (/auth/callback/google)
  if (activeView === 'oauth-callback') {
    return (
      <OAuthCallbackHandler
        onComplete={() => {
          setActiveView('dashboard');
          if (window.location.pathname !== '/dashboard') {
            window.history.pushState({ view: 'dashboard' }, '', '/dashboard');
          }
        }}
      />
    );
  }

  // If user is logged in and viewing Dashboard, render full Recovery SaaS system
  if (activeView === 'dashboard') {
    return (
      <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#07080D] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200 antialiased">
        <DashboardView
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onSwitchToLanding={handleSwitchToLanding}
          onOpenUpgrade={handleOpenUpgradeFromNavbar}
          isDark={isDark}
          setIsDark={setIsDark}
        />

        {/* Tier Purchase / Upgrade Checkout Modal */}
        <TierPurchaseModal
          isOpen={isPurchaseModalOpen}
          plan={selectedPlanForPurchase}
          isAnnual={purchaseIsAnnual}
          currentUser={currentUser}
          onClose={handleClosePurchaseModal}
          onUpgradeSuccess={handleUpgradeSuccess}
          onRequireAuth={() => handleOpenAuth('signup')}
        />
      </div>
    );
  }

  // Otherwise, render High-Tech Landing Page
  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#07080D] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-purple-600/30 selection:text-purple-300 transition-colors duration-200 antialiased">
      
      {/* Top Minimal Sticky Navigation with User Account state & Go to Dashboard */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onSignOut={handleSignOut}
        onOpenUpgrade={handleOpenUpgradeFromNavbar}
        onSwitchToDashboard={handleSwitchToDashboard}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      {/* Main Marketing Page Flow */}
      <main className="flex-1">
        {/* 1. Minimal High-Tech Hero with 3D Centerpiece */}
        <HeroSection onGetStarted={handleHeroCta} />

        {/* 2. Four-Pillar Wireframe Architecture */}
        <ArchitectureSection />

        {/* 3. Enterprise Benchmark Matrix (Autonomous vs Agencies vs Manual Excel) */}
        <ComparisonTable />

        {/* 4. Minimal Transparent Pricing with 4 BRD Tiers and Purchase capability */}
        <PricingSection
          currentUser={currentUser}
          onSelectPlan={handleSelectPlan}
          onOpenAuth={handleOpenAuth}
        />

        {/* 5. Concise FAQ Accordion */}
        <FaqSection />
      </main>

      {/* 8. Minimalist Tech Footer */}
      <Footer />

      {/* Interactive Signup / Login Modal with Supabase Bcrypt Encryption */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Tier Purchase / Upgrade Checkout Modal */}
      <TierPurchaseModal
        isOpen={isPurchaseModalOpen}
        plan={selectedPlanForPurchase}
        isAnnual={purchaseIsAnnual}
        currentUser={currentUser}
        onClose={handleClosePurchaseModal}
        onUpgradeSuccess={handleUpgradeSuccess}
        onRequireAuth={() => handleOpenAuth('signup')}
      />
    </div>
  );
}

export default App;
