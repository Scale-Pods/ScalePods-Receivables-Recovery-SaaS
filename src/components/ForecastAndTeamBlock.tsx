import React from 'react';
import { Building2, Bot, Lock, ArrowRight } from 'lucide-react';
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

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            Forecast & Team
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            4-week cash projection, monthly recovery velocity, and subsidiary entities
          </p>
        </div>

        <div className="text-[11px] font-mono text-zinc-400">
          Growth & Enterprise
        </div>
      </div>

      <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 shadow-card-light dark:shadow-card-dark overflow-hidden">
        
        {isLockedGrowth && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-900/70 dark:bg-black/80 backdrop-blur-sm p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center mb-2.5">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Forecast & Team is included in Growth & Enterprise
            </h3>
            <p className="text-xs text-zinc-300 max-w-sm mb-3">
              Predict when cash arrives with ML confidence intervals and manage multi-subsidiary receivables portfolios.
            </p>
            <button
              onClick={onUpgradePrompt}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
            >
              <span>Preview Growth Tier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4-Week Cash Forecast */}
        <div className="mb-6">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Four-Week Cash Forecast
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              Total Expected: {formatINR(totalForecastAmount)}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {forecast.map((fc) => (
              <div
                key={fc.weekLabel}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                      {fc.weekLabel.split(' ')[0]} {fc.weekLabel.split(' ')[1]}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {fc.confidencePct}% Conf
                    </span>
                  </div>

                  <div className="text-lg font-semibold font-mono tracking-tight text-zinc-900 dark:text-white tabular-nums my-1">
                    {formatINR(fc.projectedAmount)}
                  </div>

                  <div className="text-[10px] text-zinc-500 font-mono">
                    {fc.invoicesCount} expected settlements
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800 text-[10px] text-zinc-500">
                  <div className="font-medium text-zinc-400 mb-0.5">Likely Payers:</div>
                  {fc.highPayerNames.slice(0, 2).map((n, i) => (
                    <div key={i} className="truncate">• {n}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Recovery Velocity */}
        <div className="mb-6">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Monthly Cash Recovered Velocity
            </span>
            <span className="text-xs font-mono text-zinc-500">
              October: ₹9,24,000 (Record)
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {mockMonthlyRecoveryReport.map((m) => {
              const heightPct = (m.recovered / 1000000) * 100;
              return (
                <div
                  key={m.month}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-2.5 flex flex-col items-center justify-between"
                >
                  <div className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">{m.month}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{m.rate}%</span>
                  </div>

                  <div className="w-8 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-t relative flex items-end justify-center my-1">
                    <div
                      className="w-full bg-zinc-900 dark:bg-white rounded-t transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  <div className="text-xs font-mono font-semibold text-zinc-900 dark:text-white tabular-nums">
                    ₹{(m.recovered / 100000).toFixed(1)}L
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-business Subsidiaries & Team */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                Subsidiary Entities & Team
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold uppercase">
                Enterprise
              </span>
            </div>

            {!isEnterprise && (
              <span className="text-[11px] text-zinc-400 font-mono">
                Previewing Enterprise data
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
            {/* Entities */}
            <div className="space-y-1.5">
              {entities.filter(e => e.id !== 'ent-all').map((ent) => {
                const isSelected = selectedEntity.id === ent.id;
                return (
                  <div
                    key={ent.id}
                    onClick={() => onSelectEntity(ent)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/80 font-medium'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-white">{ent.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">Outstanding: {formatINR(ent.totalOutstanding)}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(ent.recoveredThisMonth)}</div>
                      <div className="text-[10px] text-zinc-500">{ent.collectionRate}% collected</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Team performance */}
            <div className="space-y-1.5">
              {mockTeamPerformance.map((tp) => (
                <div
                  key={tp.agentName}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-[10px]">
                      {tp.type === 'AI System' ? <Bot className="w-3.5 h-3.5" /> : tp.agentName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span>{tp.agentName}</span>
                        <span className="text-[9px] text-zinc-400 font-mono">({tp.type})</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">{tp.invoicesHandled} invoices • {tp.avgRecoveryDays}d avg</div>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="font-semibold text-zinc-900 dark:text-white">{formatINR(tp.recoveredAmount)}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">{tp.efficiencyScore}% efficiency</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
