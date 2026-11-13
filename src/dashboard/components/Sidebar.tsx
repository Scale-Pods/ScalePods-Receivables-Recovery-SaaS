import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Cpu, 
  TrendingUp, 
  CreditCard, 
  SlidersHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Moon, 
  Sun, 
  CheckCircle2
} from 'lucide-react';
import { PlanTier, BusinessEntity } from '../types/dashboard';
import { UserRole } from '../../types/auth';

export type ActiveTab = 
  | 'overview' 
  | 'focus'
  | 'ledger' 
  | 'intake' 
  | 'sequence' 
  | 'forecast';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  planTier: PlanTier;
  setPlanTier: (tier: PlanTier) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  selectedEntity: BusinessEntity;
  setSelectedEntity: (entity: BusinessEntity) => void;
  entities: BusinessEntity[];
  pendingActionsCount: number;
  userRole?: UserRole;
  isDevAllowed?: boolean;
  onRoleChange?: (role: UserRole) => void;
  onOpenCustomerPortal: () => void;
  onOpenPlanSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  planTier,
  isDark,
  setIsDark,
  pendingActionsCount,
  userRole = 'client',
  isDevAllowed = false,
  onOpenCustomerPortal,
  onOpenPlanSettings,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = userRole === 'developer'
    ? [
        { id: 'sequence' as ActiveTab, label: '21-Day Engine', icon: Cpu },
      ]
    : [
        { id: 'overview' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'focus' as ActiveTab, label: 'Approvals', icon: CheckCircle2, badge: pendingActionsCount > 0 ? pendingActionsCount : undefined },
        { id: 'intake' as ActiveTab, label: 'Intake', icon: UploadCloud },
        { id: 'forecast' as ActiveTab, label: 'Cash Forecast', icon: TrendingUp },
      ];

  return (
    <aside 
      className={`relative flex flex-col h-screen sticky top-0 border-r border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-[#07080D] transition-all duration-200 z-30 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`h-[70px] shrink-0 box-border border-b border-zinc-200 dark:border-zinc-800/80 flex items-center ${
        isCollapsed ? 'px-2 justify-between' : 'px-4 justify-between'
      }`}>
        {!isCollapsed ? (
          <>
            <div 
              onClick={() => setActiveTab(userRole === 'developer' ? 'sequence' : 'overview')}
              className="flex items-center cursor-pointer select-none"
            >
              <img
                src={isDark ? '/scalepods-logo-white.png' : '/scalepods-logo-dark.png'}
                alt="ScalePods"
                className="h-5 w-auto object-contain"
              />
            </div>

            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Collapse"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between">
            <button
              onClick={() => setActiveTab(userRole === 'developer' ? 'sequence' : 'overview')}
              className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs font-mono text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 border border-zinc-200 dark:border-zinc-800"
              title="ScalePods Dashboard"
              aria-label="ScalePods Dashboard"
            >
              SP
            </button>

            <button
              onClick={() => setIsCollapsed(false)}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Role Indicator - Only visible to developers who have access to both modes */}
      {isDevAllowed && !isCollapsed && (
        <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">Mode</span>
          <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 font-mono capitalize px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
            {userRole === 'developer' ? 'Developer' : 'Client'}
          </span>
        </div>
      )}

      {/* Quick Action - Client View Only */}
      {userRole !== 'developer' && (
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-800/60">
          <button
            onClick={() => setActiveTab('intake')}
            className={`w-full py-2 px-3.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
              isCollapsed ? 'px-1' : ''
            }`}
            title="Add Invoice"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Add Invoice</span>}
          </button>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 px-2.5 py-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-purple-600/15 text-purple-700 dark:text-purple-300 font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
              title={item.label}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-400'}`} />
              
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Controls */}
      <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-3 space-y-1.5">
        <button
          onClick={onOpenPlanSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          title="Usage & Details"
        >
          <SlidersHorizontal className="w-[18px] h-[18px] flex-shrink-0" />
          {!isCollapsed && <span>Usage & Details</span>}
        </button>

        {!isCollapsed ? (
          <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between px-1.5">
            <span className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400 font-semibold tracking-wider">
              {planTier}
            </span>

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="flex justify-center pt-1.5">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
