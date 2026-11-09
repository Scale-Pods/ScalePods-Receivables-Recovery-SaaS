import React from 'react';
import { 
  Layers, 
  LayoutDashboard,
  UploadCloud,
  Cpu,
  MessageSquareCode,
  Scale,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { PlanTier, BusinessEntity } from '../types/dashboard';
import { ActiveTab } from './Sidebar';

interface TopNavbarProps {
  activeTab: ActiveTab;
  planTier?: PlanTier;
  setPlanTier?: (tier: PlanTier) => void;
  selectedEntity: BusinessEntity;
  setSelectedEntity: (entity: BusinessEntity) => void;
  entities: BusinessEntity[];
  pendingActionsCount?: number;
  onOpenCustomerPortal?: () => void;
  onOpenPlanSettings?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  selectedEntity,
  setSelectedEntity,
  entities,
}) => {
  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'overview': return { title: 'Dashboard', icon: LayoutDashboard };
      case 'focus': return { title: 'Approvals & Today’s Focus', icon: CheckCircle2 };
      case 'intake': return { title: 'Invoice Intake', icon: UploadCloud };
      case 'sequence': return { title: '21-Day Sequence', icon: Cpu };
      case 'simulator': return { title: 'AI Agent & Channels', icon: MessageSquareCode };
      case 'day22': return { title: 'Day 22 Approvals', icon: Scale };
      case 'forecast': return { title: 'Cash Forecast', icon: TrendingUp };
      default: return { title: 'Dashboard', icon: LayoutDashboard };
    }
  };

  const current = getTabTitle(activeTab);
  const CurrentIcon = current.icon;

  return (
    <header className="sticky top-0 z-20 h-[70px] shrink-0 box-border border-b border-zinc-200 dark:border-zinc-800/80 bg-white/90 dark:bg-[#07080D]/90 backdrop-blur-md px-6 flex items-center justify-between">
      
      {/* Title */}
      <div className="flex items-center gap-3">
        <CurrentIcon className="w-5 h-5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-white tracking-tight">
          {current.title}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        
        {/* Entity Selector */}
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2 bg-zinc-50 dark:bg-zinc-900/60 shadow-xs">
          <Layers className="w-4 h-4 text-zinc-400" />
          <select
            aria-label="Select organization entity"
            value={selectedEntity.id}
            onChange={(e) => {
              const found = entities.find(ent => ent.id === e.target.value);
              if (found) setSelectedEntity(found);
            }}
            className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-medium focus:outline-none cursor-pointer"
          >
            {entities.map(ent => (
              <option key={ent.id} value={ent.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                {ent.name}
              </option>
            ))}
          </select>
        </div>

      </div>

    </header>
  );
};
