import React from 'react';
import { 
  Building2, 
  Bot, 
  Lock, 
  ArrowRight, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Users
} from 'lucide-react';
import { CashForecastWeek, BusinessEntity, PlanTier } from '../types/dashboard';
import { mockMonthlyRecoveryReport, mockTeamPerformance } from '../data/mockData';
import { formatINR } from '../utils/formatters';

interface ForecastAndTeamBlockProps {
  forecast: CashForecastWeek[];
  entities: BusinessEntity[];
  selectedEntity: BusinessEntity;
  onSelectEntity: (entity: BusinessEntity) => void;
  planTier: PlanTier;
  onUpgradePrompt: () => void;
}

export const ForecastAndTeamBlock: React.FC<ForecastAndTeamBlockProps> = ({
  forecast,
  entities,
  selectedEntity,
  onSelectEntity,
  planTier,
  onUpgradePrompt,
}) => {
  const isLockedGrowth = planTier === 'free' || planTier === 'basic';
  const isEnterprise = planTier === 'enterprise';

  const totalForecastAmount = forecast.reduce((sum, f) => sum + f.projectedAmount, 0);
  const totalSettlementsExpected = forecast.reduce((sum, f) => sum + f.invoicesCount, 0);
  const weightedForecast = forecast.reduce((sum, f) => sum + (f.projectedAmount * (f.confidencePct / 100)), 0);
  const avgConfidence = Math.round(
    forecast.reduce((sum, f) => sum + f.confidencePct, 0) / (forecast.length || 1)
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Cash Inflow Forecast & Liquidity Engine
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Machine learning cash-inflow predictions, confidence intervals, and recovery velocity trajectory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
            Growth & Enterprise
          </span>
          {isLockedGrowth && (
            <button
              onClick={onUpgradePrompt}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Unlock ML Forecast</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Upgrade Wall Overlay if Free/Basic */}
        {isLockedGrowth && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/60 dark:bg-black/75 backdrop-blur-sm rounded-2xl p-6 text-center">
            <div className="w-11 h-11 rounded-2xl bg-zinc-800/90 border border-zinc-700 text-white flex items-center justify-center mb-3 shadow-lg">
              <Lock className="w-5 h-5 text-zinc-300" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">
              Cash Forecast & Team Analytics included in Growth Tier
            </h3>
            <p className="text-xs text-zinc-300 max-w-md mb-4 leading-relaxed">
              Unlock predictive ML payment schedules, monthly velocity tracking, and multi-subsidiary receivables portfolio aggregation.
            </p>
            <button
              onClick={onUpgradePrompt}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-2 shadow-md cursor-pointer"
            >
              <span>Preview Growth Tier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Forecast KPI Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-4 shadow-sm">
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              4-Week Projected Inflow
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1 tabular-nums">
              {formatINR(totalForecastAmount)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{totalSettlementsExpected} settlements</span>
              <span>• Next 28 days</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-4 shadow-sm">
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Confidence-Weighted Cash
            </div>
            <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {formatINR(Math.round(weightedForecast))}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {avgConfidence}% weighted probability
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-4 shadow-sm">
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Peak Month Velocity
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-1 tabular-nums">
              ₹9,24,000
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              October (78.4% collection rate)
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] p-4 shadow-sm">
            <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Prediction Accuracy
            </div>
            <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
              94.2%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Historical variance ±₹18.4K
            </div>
          </div>
        </div>

        {/* 4-Week Cash Forecast Cards */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Four-Week Liquidity Projections
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              Total Inflow: {formatINR(totalForecastAmount)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {forecast.map((fc, index) => {
              const weekNumber = index + 1;
              return (
                <div
                  key={fc.weekLabel}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#0A0B10] p-4 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Week Title & Confidence */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div>
                        <span className="text-xs font-bold font-mono text-zinc-900 dark:text-white">
                          Week {weekNumber}
                        </span>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {fc.dateRange || fc.weekLabel.split('(')[1]?.replace(')', '') || '7 days'}
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                        {fc.confidencePct}% Conf
                      </span>
                    </div>

                    {/* Projected Amount */}
                    <div className="my-3">
                      <div className="text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums">
                        {formatINR(fc.projectedAmount)}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                        {fc.invoicesCount} expected settlements
                      </div>
                    </div>
                  </div>

                  {/* Top Expected Payers */}
                  <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      Expected Payers
                    </div>
                    <div className="space-y-1">
                      {fc.highPayerNames.slice(0, 2).map((payer, idx) => (
                        <div
                          key={idx}
                          className="px-2 py-1 rounded-md bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 truncate"
                        >
                          {payer}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Recovery Velocity Section */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#0A0B10] p-5 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Monthly Recovery Velocity & Trajectory
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Month-on-month cash recovered with benchmark collection efficiency targets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                October Record: ₹9,24,000 (78.4%)
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="grid grid-cols-5 gap-3 sm:gap-6 pt-4 pb-2">
            {mockMonthlyRecoveryReport.map((m) => {
              const maxScale = 1000000;
              const heightPct = Math.min(100, Math.round((m.recovered / maxScale) * 100));
              const isPeak = m.month === 'Oct';

              return (
                <div key={m.month} className="flex flex-col items-center">
                  {/* Amount Label */}
                  <div className="text-xs font-bold font-mono text-zinc-900 dark:text-white tabular-nums mb-2">
                    ₹{(m.recovered / 100000).toFixed(1)}L
                  </div>

                  {/* Bar Track */}
                  <div className="w-full max-w-[56px] h-28 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl relative flex items-end justify-center p-1 border border-zinc-200/50 dark:border-zinc-800">
                    <div
                      className={`w-full rounded-lg transition-all duration-300 ${
                        isPeak
                          ? 'bg-emerald-600 dark:bg-emerald-500 shadow-sm'
                          : 'bg-zinc-900 dark:bg-white'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Month & Rate */}
                  <div className="mt-2.5 text-center">
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                      {m.month}
                    </div>
                    <div className={`text-[10px] font-mono mt-0.5 font-semibold ${
                      isPeak ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'
                    }`}>
                      {m.rate}% rate
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-business Subsidiaries & Team Split */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#0A0B10] p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Subsidiary Entities & Recovery Team
                </h3>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Multi-entity portfolio consolidation and recovery efficiency ratings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase">
                Enterprise Portfolio
              </span>
              {!isEnterprise && (
                <span className="text-[11px] text-zinc-400 font-mono">
                  (Preview Mode)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Subsidiary Entities Column */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Portfolio Operating Entities
              </div>
              {entities.filter(e => e.id !== 'ent-all').map((ent) => {
                const isSelected = selectedEntity.id === ent.id;
                return (
                  <div
                    key={ent.id}
                    onClick={() => onSelectEntity(ent)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0E0F17] hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-zinc-900 dark:text-white">{ent.name}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          Outstanding: {formatINR(ent.totalOutstanding)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                        {formatINR(ent.recoveredThisMonth)}
                      </div>
                      <div className="text-[10px] text-zinc-500">{ent.collectionRate}% collected</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Team Performance Column */}
            <div className="space-y-2">
              <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Recovery Engine & Specialists
              </div>
              {mockTeamPerformance.map((tp) => (
                <div
                  key={tp.agentName}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0E0F17] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-xs border border-zinc-200 dark:border-zinc-700">
                      {tp.type === 'AI System' ? (
                        <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        tp.agentName.charAt(0)
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span>{tp.agentName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono font-normal">({tp.type})</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {tp.invoicesHandled} invoices • {tp.avgRecoveryDays}d avg cycle
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-semibold text-xs text-zinc-900 dark:text-white">
                      {formatINR(tp.recoveredAmount)}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {tp.efficiencyScore}% efficiency
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
