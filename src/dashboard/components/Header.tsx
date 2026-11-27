import React from 'react';
import { Sparkles, LogOut } from 'lucide-react';
import { PlanTier, BusinessEntity } from '../types/dashboard';
import { ActiveTab } from './Sidebar';
import { UserAccount } from '../../types/auth';

interface TopNavbarProps {
  activeTab: ActiveTab;
  planTier?: PlanTier;
  setPlanTier?: (tier: PlanTier) => void;
  selectedEntity?: BusinessEntity;
  setSelectedEntity?: (entity: BusinessEntity) => void;
  entities?: BusinessEntity[];
  pendingActionsCount?: number;
  currentUser?: UserAccount | null;
  onOpenCustomerPortal?: () => void;
  onOpenPlanSettings?: () => void;
  onSwitchToLanding?: () => void;
  onSignOut?: () => void;
  onOpenUpgrade?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenUpgrade,
  onOpenPlanSettings,
  onSignOut,
}) => {
  const handleUpgradeClick = () => {
    if (onOpenUpgrade) {
      onOpenUpgrade();
    } else if (onOpenPlanSettings) {
      onOpenPlanSettings();
    }
  };

  return (
    <header className="sticky top-0 z-20 h-[70px] shrink-0 box-border border-b border-white/80 bg-white/65 backdrop-blur-xl backdrop-saturate-150 dark:border-zinc-800/80 dark:bg-[#07080D]/90 dark:backdrop-blur-md px-[clamp(12px,2.2vw,48px)] flex items-center justify-between shadow-[0_10px_30px_-24px_rgba(76,29,149,0.35)]">
      {/* Right Controls: Upgrade and Sign Out */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Upgrade Button */}
        <button
          onClick={handleUpgradeClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-purple-600/35 hover:shadow-purple-600/50 transition-all cursor-pointer"
          title="Upgrade Plan Tier"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Upgrade</span>
        </button>

        {/* Sign Out Button */}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}

      </div>

    </header>
  );
};
