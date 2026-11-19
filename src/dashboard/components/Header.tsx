import React from 'react';
import { 
  LayoutDashboard,
  UploadCloud,
  Cpu,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  Settings,
  LogOut
} from 'lucide-react';
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
  activeTab,
  currentUser,
  onOpenUpgrade,
  onOpenPlanSettings,
  onSignOut,
}) => {
  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview': return { title: 'Dashboard', icon: LayoutDashboard };
      case 'focus': return { title: 'Approvals & Today’s Focus', icon: CheckCircle2 };
      case 'intake': return { title: 'Invoice Intake', icon: UploadCloud };
      case 'sequence': return { title: '21-Day Sequence', icon: Cpu };
      case 'forecast': return { title: 'Cash Forecast', icon: TrendingUp };
      default: return { title: 'Dashboard', icon: LayoutDashboard };
    }
  };

  const current = getTabTitle(activeTab);
  const CurrentIcon = current.icon;

  const handleUpgradeClick = () => {
    if (onOpenUpgrade) {
      onOpenUpgrade();
    } else if (onOpenPlanSettings) {
      onOpenPlanSettings();
    }
  };

  return (
    <header className="sticky top-0 z-20 h-[70px] shrink-0 box-border border-b border-slate-200/90 dark:border-zinc-800/80 bg-white/90 dark:bg-[#07080D]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <CurrentIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">
          {current.title}
        </h1>
      </div>

      {/* Right Controls: Settings, Upgrade, and Sign Out */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Settings Button (Opens Mailbox & Platform Settings) */}
        {onOpenPlanSettings && (
          <button
            onClick={onOpenPlanSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700/60 transition-colors cursor-pointer"
            title="Settings & Integrations"
          >
            <Settings className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}

        {/* Upgrade Button */}
        <button
          onClick={handleUpgradeClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 shadow-md shadow-purple-600/30 transition-all cursor-pointer"
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
