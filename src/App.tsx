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
import { signOutUser, updatePlanTierInSupabase } from './lib/supabase';

export function App() {
  // Navigation View: 'landing' (marketing site) | 'dashboard' (Recovery SaaS core system)
  const [activeView, setActiveView] = useState<'landing' | 'dashboard'>('landing');

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
      }
    } catch (err) {
      console.warn('Failed to parse stored user', err);
    }
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
  };

  // On Login/Signup Success: save user and automatically switch directly to the Dashboard!
  const handleAuthSuccess = (account: UserAccount) => {
    setCurrentUser(account);
    setActiveView('dashboard');
  };

  // Plan Selection & Purchase Handlers
  const handleSelectPlan = (plan: PricingPlan, isAnnual: boolean) => {
    setSelectedPlanForPurchase(plan);
    setPurchaseIsAnnual(isAnnual);
    setIsPurchaseModalOpen(true);
  };

  const handleOpenUpgradeFromNavbar = () => {
    setSelectedPlanForPurchase(null);
    setPurchaseIsAnnual(true);
    setIsPurchaseModalOpen(true);
  };

  const handleUpgradeSuccess = async (newTier: PlanTierType, cycle: 'monthly' | 'annual') => {
    if (currentUser) {
      const updated: UserAccount = {
        ...currentUser,
        planTier: newTier,
        billingCycle: cycle,
      };
      setCurrentUser(updated);
      await updatePlanTierInSupabase(currentUser.id || '', newTier, cycle);
    }
  };

  const handleHeroCta = () => {
    if (!currentUser) {
      handleOpenAuth('signup');
    } else {
      setActiveView('dashboard');
    }
  };

  // If user is logged in and viewing Dashboard, render full Recovery SaaS system
  if (activeView === 'dashboard') {
    return (
      <div className="min-h-screen bg-[#07080D] text-zinc-100 flex flex-col font-sans antialiased">
        <DashboardView
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onSwitchToLanding={() => setActiveView('landing')}
          onOpenUpgrade={handleOpenUpgradeFromNavbar}
        />

        {/* Tier Purchase / Upgrade Checkout Modal */}
        <TierPurchaseModal
          isOpen={isPurchaseModalOpen}
          plan={selectedPlanForPurchase}
          isAnnual={purchaseIsAnnual}
          currentUser={currentUser}
          onClose={() => setIsPurchaseModalOpen(false)}
          onUpgradeSuccess={handleUpgradeSuccess}
          onRequireAuth={() => handleOpenAuth('signup')}
        />
      </div>
    );
  }

  // Otherwise, render High-Tech Landing Page
  return (
    <div className="min-h-screen bg-[#07080D] text-zinc-100 flex flex-col font-sans selection:bg-purple-600/30 selection:text-purple-300 antialiased">
      
      {/* Top Minimal Sticky Navigation with User Account state & Go to Dashboard */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onSignOut={handleSignOut}
        onOpenUpgrade={handleOpenUpgradeFromNavbar}
        onSwitchToDashboard={() => setActiveView('dashboard')}
      />

      {/* Main Marketing Page Flow */}
      <main className="flex-1">
        {/* 1. Minimal High-Tech Hero with 3D Centerpiece */}
        <HeroSection onGetStarted={handleHeroCta} />

        {/* 2. Four-Pillar Wireframe Architecture */}
        <ArchitectureSection />

        {/* 3. Enterprise Benchmark Matrix (RECOVR vs Agencies vs Manual Excel) */}
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
        onClose={() => setIsPurchaseModalOpen(false)}
        onUpgradeSuccess={handleUpgradeSuccess}
        onRequireAuth={() => handleOpenAuth('signup')}
      />
    </div>
  );
}

export default App;
