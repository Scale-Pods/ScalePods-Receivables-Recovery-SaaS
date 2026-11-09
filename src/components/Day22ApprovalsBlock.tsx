import React, { useState } from 'react';
import { 
  Scale, 
  CheckCircle2, 
  FileText, 
  Users, 
  FileCheck2,
  X
} from 'lucide-react';
import { PlanTier } from '../types/dashboard';
import { formatINR } from '../utils/formatters';

interface Day22Item {
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
      recommendationTitle: 'Credit Hold & Delivery Dispatch Stop',
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
      recommendationTitle: '3-Part RTGS Settlement Plan',
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
      recommendationTitle: '7-Day Demand Notice (Section 138 / IBC)',
      documentSnippet: 'Pre-litigation formal demand notice under Section 138 NI Act / Section 8 IBC. 7 calendar days granted to remit balance before filing on MSME Samadhaan.',
      alertTeams: ['Legal Counsel'],
      status: 'pending',
    },
  ]);

  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<Day22Item | null>(null);

  const handleApprove = (item: Day22Item) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'approved' } : i))
    );
    onApproveAction(item, item.recommendationType);
  };

  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">Day 22 Escalation</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Post-21-day legal actions and owner sign-offs.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-xs font-mono text-zinc-700 dark:text-zinc-300">
            Pending: <strong className="text-rose-600 dark:text-rose-400">{pendingCount}</strong>
          </span>
          {planTier !== 'enterprise' && (
            <button
              onClick={() => onUpgradePrompt('enterprise')}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              Enterprise
            </button>
          )}
        </div>
      </div>

      {/* Escalation Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item) => {
          const isApproved = item.status === 'approved';

          return (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition-all shadow-sm ${
                isApproved
                  ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-[#0A0D10]/80 opacity-75'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0A0B10] hover:border-zinc-400 dark:hover:border-zinc-600'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">{item.customerCompany}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                      {item.daysOverdue}d overdue
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    {item.customerName} • #{item.invoiceNumber} • {formatINR(item.amount)}
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {item.recommendationType.replace('_', ' ')}
                </span>
              </div>

              {/* Recommendation Title */}
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>{item.recommendationTitle}</span>
              </h3>

              {/* Calculation Box */}
              {item.statutoryCalculation && (
                <div className="mb-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-xs font-mono space-y-1">
                  <div className="text-[10px] text-zinc-700 dark:text-zinc-300 font-semibold">
                    {item.statutoryCalculation.lawBasis}
                  </div>
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                    <span>Principal: {formatINR(item.statutoryCalculation.principal)}</span>
                    <span>Interest: +{formatINR(item.statutoryCalculation.interestAmount)}</span>
                    <span>Fee: +{formatINR(item.statutoryCalculation.statutoryCompensationFee)}</span>
                  </div>
                  <div className="pt-1 border-t border-zinc-200 dark:border-zinc-700 flex justify-between font-bold text-zinc-900 dark:text-white">
                    <span>Enforceable Claim:</span>
                    <span>{formatINR(item.statutoryCalculation.totalClaimAmount)}</span>
                  </div>
                </div>
              )}

              {/* Snippet */}
              <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#08090E] text-xs text-zinc-700 dark:text-zinc-300 font-mono mb-3 leading-relaxed">
                "{item.documentSnippet}"
              </div>

              {/* Teams to Alert */}
              {item.alertTeams && (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[11px]">Alerts:</span>
                  <div className="flex flex-wrap gap-1">
                    {item.alertTeams.map((team, idx) => (
                      <span key={idx} className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <button
                  onClick={() => setSelectedPreviewDoc(item)}
                  className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                >
                  <FileText className="w-3 h-3" />
                  <span>Preview Notice</span>
                </button>

                {isApproved ? (
                  <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approved</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleApprove(item)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Document Preview Modal */}
      {selectedPreviewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 text-zinc-900 dark:text-zinc-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Legal Notice Preview</h3>
              </div>
              <button
                onClick={() => setSelectedPreviewDoc(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 font-mono text-xs text-zinc-800 dark:text-zinc-300 space-y-2">
              <div className="font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-700 pb-1.5">
                NOTICE OF CLAIM: {selectedPreviewDoc.customerCompany}
              </div>
              <p>Invoice: {selectedPreviewDoc.invoiceNumber}</p>
              <p>Principal: {formatINR(selectedPreviewDoc.amount)}</p>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{selectedPreviewDoc.documentSnippet}</p>
            </div>

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
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
