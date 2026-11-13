import React from 'react';
import { 
  LayoutDashboard,
  UploadCloud,
  Cpu,
  TrendingUp,
  CheckCircle2,
  Sparkles,
  LogOut,
  User,
  Code2
} from 'lucide-react';
import { PlanTier, BusinessEntity } from '../types/dashboard';
import { ActiveTab } from './Sidebar';
import { UserAccount, UserRole } from '../../types/auth';
import { isDeveloperUser } from '../../lib/roles';

interface TopNavbarProps {
  activeTab: ActiveTab;
  planTier?: PlanTier;
  setPlanTier?: (tier: PlanTier) => void;
  selectedEntity?: BusinessEntity;
  setSelectedEntity?: (entity: BusinessEntity) => void;
  entities?: BusinessEntity[];
  pendingActionsCount?: number;
  currentUser?: UserAccount | null;
  userRole?: UserRole;
  isDevAllowed?: boolean;
  onRoleChange?: (role: UserRole) => void;
  onOpenCustomerPortal?: () => void;
  onOpenPlanSettings?: () => void;
  onSwitchToLanding?: () => void;
  onSignOut?: () => void;
  onOpenUpgrade?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  currentUser,
  userRole = 'client',
  isDevAllowed,
  onRoleChange,
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
    <header className="sticky top-0 z-20 h-[70px] shrink-0 box-border border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#07080D]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <CurrentIcon className="w-5 h-5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">
          {current.title}
        </h1>
      </div>

      {/* Right Controls: Role Switcher, Upgrade and Sign Out */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Clean Segmented Role Switcher (Client vs Developer) - ONLY VISIBLE TO APPROVED DEVELOPERS */}
        {(isDevAllowed ?? isDeveloperUser(currentUser)) && onRoleChange && (
          <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-medium">
            <button
              type="button"
              onClick={() => onRoleChange('client')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                userRole === 'client'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Client View"
            >
              <User className="w-3.5 h-3.5" />
              <span>Client</span>
            </button>
            <button
              type="button"
              onClick={() => onRoleChange('developer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer ${
                userRole === 'developer'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
              title="Developer View"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Developer</span>
            </button>
          </div>
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
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
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
