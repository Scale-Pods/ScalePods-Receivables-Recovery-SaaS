import React, { useState } from 'react';
import { 
  Scale, 
  CheckCircle2, 
  FileText, 
  Users, 
  FileCheck2,
  X,
  ShieldAlert,
  AlertOctagon,
  FileWarning,
  Layers,
  ArrowUpRight,
  Clock,
  Send,
  Eye
} from 'lucide-react';
import { PlanTier } from '../types/dashboard';
import { formatINR } from '../utils/formatters';
import { CompanyAvatar } from './CompanyAvatar';

export interface Day22Item {
  id: string;
  invoiceNumber: string;
  customerCompany: string;
  customerName: string;
  amount: number;
  daysOverdue: number;
  riskTier: 'high_risk' | 'watch';
  recommendationType: 'statutory_interest' | 'credit_hold' | 'legal_notice' | 'settlement_plan';
  recommendationTitle: string;
  statutoryCalculation?: {
    lawBasis: string;
    principal: number;
    interestAmount: number;
    statutoryCompensationFee: number;
    totalClaimAmount: number;
  };
  documentSnippet: string;
  alertTeams?: string[];
  status: 'pending' | 'approved' | 'dismissed';
}

interface Day22ApprovalsBlockProps {
  planTier: PlanTier;
  onApproveAction: (item: Day22Item, actionKey: string) => void;
  onUpgradePrompt: (tier: PlanTier) => void;
}

export const Day22ApprovalsBlock: React.FC<Day22ApprovalsBlockProps> = ({
  planTier,
  onApproveAction,
  onUpgradePrompt,
}) => {
  const [items, setItems] = useState<Day22Item[]>([
    {
      id: 'd22-1',
      invoiceNumber: 'INV-2024-7108',
      customerCompany: 'Nexora Infotech Pvt Ltd',
      customerName: 'Rajesh Sharma',
      amount: 284000,
      daysOverdue: 68,
      riskTier: 'high_risk',
      recommendationType: 'statutory_interest',
      recommendationTitle: 'MSMED Act Section 16 Statutory Interest Claim',
      statutoryCalculation: {
        lawBasis: 'Section 16 MSMED Act 2006 (3x RBI Bank Rate = 19.5% p.a. compounded monthly)',
        principal: 284000,
        interestAmount: 10180.00,
        statutoryCompensationFee: 5000.00,
        totalClaimAmount: 299180.00,
      },
      documentSnippet: 'Statutory compound interest of ₹10,180.00 plus legal filing fee of ₹5,000.00 accrued under Section 16 MSMED Act on principal of ₹2,84,000.00. Total enforceable debt: ₹2,99,180.00.',
      alertTeams: ['Legal Counsel', 'Executive Finance'],
      status: 'pending',
    },
    {
      id: 'd22-2',
      invoiceNumber: 'INV-2024-6902',
      customerCompany: 'Helios Media Network India LLP',
      customerName: 'Rohan Mehta',
      amount: 192000,
      daysOverdue: 72,
      riskTier: 'high_risk',
      recommendationType: 'credit_hold',
      recommendationTitle: 'Commercial Credit Suspension & Delivery Dispatch Stop',
      documentSnippet: 'Enforce commercial credit suspension. Dispatch hold notices to Sales Director and Warehouse Logistics to pause pending deliverables.',
      alertTeams: ['Sales Director', 'Dispatch & Logistics'],
      status: 'pending',
    },
    {
      id: 'd22-3',
      invoiceNumber: 'INV-2024-8114',
      customerCompany: 'Cyberdyne Data Robotics India',
      customerName: 'Dr. Amit Sen',
      amount: 145000,
      daysOverdue: 64,
      riskTier: 'watch',
      recommendationType: 'settlement_plan',
      recommendationTitle: 'Structured 3-Part RTGS Settlement Plan',
      documentSnippet: 'Recommend 3-part split: ₹58,000 today (40%), ₹43,500 in 15 days (30%), ₹43,500 in 30 days (30%).',
      alertTeams: ['Accounts Receivable'],
      status: 'pending',
    },
    {
      id: 'd22-4',
      invoiceNumber: 'INV-2024-5509',
      customerCompany: 'Apex Logistics Freight India',
      customerName: 'Vikram Malhotra',
      amount: 89000,
      daysOverdue: 75,
      riskTier: 'high_risk',
      recommendationType: 'legal_notice',
      recommendationTitle: '7-Day Pre-Litigation Demand Notice (Section 138 / IBC)',
      documentSnippet: 'Pre-litigation formal demand notice under Section 138 NI Act / Section 8 IBC. 7 calendar days granted to remit balance before filing on MSME Samadhaan.',
      alertTeams: ['Legal Counsel'],
      status: 'pending',
    },
  ]);

  const [filterType, setFilterType] = useState<string>('all');
  const [showApprovedOnly, setShowApprovedOnly] = useState<boolean>(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<Day22Item | null>(null);

  const handleApprove = (item: Day22Item) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'approved' } : i))
    );
    onApproveAction(item, item.recommendationType);
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const approvedCount = items.filter((i) => i.status === 'approved').length;

  const filteredItems = items.filter((item) => {
    if (showApprovedOnly && item.status !== 'approved') return false;
    if (filterType === 'all') return true;
    return item.recommendationType === filterType;
  });

  const getActionBadge = (type: Day22Item['recommendationType']) => {
    switch (type) {
      case 'statutory_interest':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            <Scale className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            MSMED Section 16 Claim
          </span>
        );
      case 'credit_hold':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Commercial Credit Hold
          </span>
        );
      case 'legal_notice':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
            <FileWarning className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            7-Day Pre-Litigation Demand
          </span>
        );
      case 'settlement_plan':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Structured RTGS Settlement
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
              <Scale className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
              Day 22 Escalation & Legal Actions
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Autonomous follow-ups conclude at Day 21. Actionable statutory claims, credit holds, and legal demand sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {planTier !== 'enterprise' && (
            <button
              onClick={() => onUpgradePrompt('enterprise')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-all cursor-pointer shadow-sm flex items-center gap-1"
            >
              <span>Unlock Enterprise Legal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: `All Actionable (${items.length})` },
            { id: 'statutory_interest', label: 'MSMED Interest' },
            { id: 'credit_hold', label: 'Credit Suspensions' },
            { id: 'legal_notice', label: 'Demand Notices' },
            { id: 'settlement_plan', label: 'Settlement Plans' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterType === tab.id
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm font-semibold'
                  : 'bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showApprovedOnly}
            onChange={(e) => setShowApprovedOnly(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 cursor-pointer"
          />
          <span>Show Approved Only ({approvedCount})</span>
        </label>
      </div>

      {/* Escalation Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const isApproved = item.status === 'approved';

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                isApproved
                  ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-950/10'
                  : 'border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#0A0B10] hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
              }`}
            >
              <div className="space-y-4">
                {/* Header: Avatar, Company, Status Pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CompanyAvatar
                      name={item.customerCompany}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-900 dark:text-white">
                          {item.customerCompany}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          {item.daysOverdue}d Overdue
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>Inv #{item.invoiceNumber}</span>
                        <span>•</span>
                        <span>{item.customerName}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {getActionBadge(item.recommendationType)}
                  </div>
                </div>

                {/* Recommendation Headline */}
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {item.recommendationTitle}
                </div>

                {/* Statutory Calculation Breakdown Box */}
                {item.statutoryCalculation && (
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/50 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
                      <span>Statutory Basis</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium text-right max-w-[240px] truncate">
                        Section 16 MSMED Act 2006 (19.5% p.a.)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                        <div className="text-[10px] text-zinc-500 uppercase">Principal</div>
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                          {formatINR(item.statutoryCalculation.principal)}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase">Compound Interest</div>
                        <div className="font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                          +{formatINR(item.statutoryCalculation.interestAmount)}
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
                        <div className="text-[10px] text-zinc-500 uppercase">Filing Fee</div>
                        <div className="font-semibold text-zinc-700 dark:text-zinc-300 mt-0.5">
                          +{formatINR(item.statutoryCalculation.statutoryCompensationFee)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between font-mono text-xs">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Enforceable Total Claim:</span>
                      <span className="font-bold text-sm text-zinc-900 dark:text-white tabular-nums">
                        {formatINR(item.statutoryCalculation.totalClaimAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Rationale Excerpt */}
                <div className="relative pl-3 border-l-2 border-zinc-300 dark:border-zinc-700 py-0.5">
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-mono leading-relaxed line-clamp-2">
                    "{item.documentSnippet}"
                  </p>
                </div>

                {/* Stakeholder Notification Pills */}
                {item.alertTeams && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Alerts:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.alertTeams.map((team, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                        >
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedPreviewDoc(item)}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Preview Notice</span>
                </button>

                {isApproved ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Action Approved & Issued</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleApprove(item)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {item.recommendationType === 'credit_hold' ? 'Enforce Credit Hold' : 'Approve & Issue'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Formal Document Preview Modal */}
      {selectedPreviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0E0F17] p-6 text-zinc-900 dark:text-zinc-100 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Formal Enforcement Docket</h3>
                  <p className="text-[11px] font-mono text-zinc-500">Docket Ref: D22-{selectedPreviewDoc.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPreviewDoc(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Content Box */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#07080D] font-mono text-xs space-y-3">
              <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase">RESPONDENT</div>
                  <div className="font-bold text-zinc-900 dark:text-white mt-0.5">{selectedPreviewDoc.customerCompany}</div>
                  <div className="text-[11px] text-zinc-500">Attn: {selectedPreviewDoc.customerName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400 uppercase">ACTION TYPE</div>
                  <div className="font-semibold text-rose-600 dark:text-rose-400 mt-0.5 uppercase">
                    {selectedPreviewDoc.recommendationType.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
                <div className="flex justify-between">
                  <span>Underlying Invoice:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">#{selectedPreviewDoc.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Principal Default Amount:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{formatINR(selectedPreviewDoc.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overdue Aging:</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">{selectedPreviewDoc.daysOverdue} calendar days</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {selectedPreviewDoc.documentSnippet}
              </div>

              <div className="text-[10px] text-zinc-400 pt-1">
                Notice will be served via registered legal email, WhatsApp business API, and archived in the immutable debt ledger.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setSelectedPreviewDoc(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleApprove(selectedPreviewDoc);
                  setSelectedPreviewDoc(null);
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Sign & Approve Enforcement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
