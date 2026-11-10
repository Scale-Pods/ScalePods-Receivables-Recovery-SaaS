import React, { useState } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  PhoneCall, 
  Mail, 
  ChevronRight,
  Lock
} from 'lucide-react';
import { 
  Invoice, 
  AgeingBucketId, 
  InvoiceStatus, 
  PlanTier,
  PaymentRecord
} from '../types/dashboard';
import { formatINR } from '../utils/formatters';
import { CompanyAvatar } from './CompanyAvatar';

interface LedgerTableBlockProps {
  invoices: Invoice[];
  selectedBucket: AgeingBucketId;
  onSelectBucket: (b: AgeingBucketId) => void;
  planTier: PlanTier;
  onRowClick: (invoice: Invoice) => void;
  onMarkPaid: (invoice: Invoice) => void;
  onViewProof: (invoice: Invoice) => void;
  onPauseResume: (invoice: Invoice) => void;
  onResendNotice: (invoice: Invoice) => void;
  onChangeBucket: (invoice: Invoice) => void;
  onAnswerTicket: (invoice: Invoice) => void;
  onInspectRisk: (invoice: Invoice) => void;
  payments?: PaymentRecord[];
}

export const LedgerTableBlock: React.FC<LedgerTableBlockProps> = ({
  invoices,
  selectedBucket,
  onSelectBucket,
  onRowClick,
  onMarkPaid,
  onViewProof,
  onInspectRisk,
  payments = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewTab, setViewTab] = useState<'active' | 'settled'>('active');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');
  const [sortField, setSortField] = useState<'dueDate' | 'amount' | 'riskScore'>('dueDate');
  const [sortAsc, setSortAsc] = useState(false);

  const activeInvoices = invoices.filter((i) => i.status !== 'paid' && i.currentStage !== 'Done');
  const settledInvoices = invoices.filter((i) => i.status === 'paid' || i.currentStage === 'Done');

  // Filter invoices
  const filtered = invoices.filter((inv) => {
    const isPaid = inv.status === 'paid' || inv.currentStage === 'Done';
    if (viewTab === 'active' && isPaid) return false;
    if (viewTab === 'settled' && !isPaid) return false;

    if (selectedBucket !== 'all' && inv.bucket !== selectedBucket) return false;
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerCompany.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'amount') {
      diff = a.amount - b.amount;
    } else if (sortField === 'riskScore') {
      diff = a.riskScore - b.riskScore;
    } else {
      diff = a.daysOverdue - b.daysOverdue;
    }
    return sortAsc ? diff : -diff;
  });

  // Color applied ONLY to Ageing Bucket badge
  const getBucketBadge = (bucket: Invoice['bucket']) => {
    switch (bucket) {
      case 'early':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
            Early
          </span>
        );
      case '15+':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            15+
          </span>
        );
      case '30+':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            30+
          </span>
        );
      case '60+':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
            60+
          </span>
        );
    }
  };

  // Color applied ONLY to Risk Tier badge - showing score
  const getRiskScoreBadge = (inv: Invoice) => {
    let colorClass = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
    let label = 'Reliable';
    if (inv.riskTier === 'high_risk') {
      colorClass = 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20';
      label = 'High Risk';
    } else if (inv.riskTier === 'watch') {
      colorClass = 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      label = 'Watch';
    }

    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          onInspectRisk(inv);
        }}
        className="inline-flex items-center gap-1.5 cursor-pointer"
        title={`Score: ${inv.riskScore} (${label}) - Click to inspect risk`}
      >
        <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-md border ${colorClass} flex items-center gap-1 hover:opacity-80 transition-opacity`}>
          <span>{inv.riskScore}</span>
          {inv.isLockedByOwner && <Lock className="w-3 h-3 ml-0.5 text-amber-500" />}
        </span>
      </div>
    );
  };

  // Clean Neutral Status Badge with semantic dot indicator
  const getStatusBadge = (status: InvoiceStatus, currentStage: Invoice['currentStage']) => {
    if (status === 'paid' || currentStage === 'Done') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Settled</span>
        </span>
      );
    }
    if (status === 'disputed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          <span>Disputed</span>
        </span>
      );
    }
    if (status === 'promise') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Promised</span>
        </span>
      );
    }
    if (status === 'paused') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <span>3-Day Hold</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        <span>Active</span>
      </span>
    );
  };

  const getChannelIcon = (ch: Invoice['lastTouch']['channel']) => {
    switch (ch) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />;
      case 'voice':
        return <PhoneCall className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />;
      case 'email':
      default:
        return <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />;
    }
  };

  return (
    <section className="space-y-4">
      {/* View Switcher: Active Receivables vs Settled & Paid History */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#0D0E15] border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <button
            onClick={() => {
              setViewTab('active');
              setStatusFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              viewTab === 'active'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Active Receivables (Pending)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
              {activeInvoices.length}
            </span>
          </button>

          <button
            onClick={() => {
              setViewTab('settled');
              setStatusFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              viewTab === 'settled'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Settled & Paid Archive</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
              {settledInvoices.length}
            </span>
          </button>
        </div>
      </div>

      {/* Top Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0D0E15] p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
        
        {/* Bucket filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'early', '15+', '30+', '60+'] as AgeingBucketId[]).map((b) => {
            const currentScopeInvoices = viewTab === 'active' ? activeInvoices : settledInvoices;
            const count = b === 'all' 
              ? currentScopeInvoices.length 
              : currentScopeInvoices.filter(i => i.bucket === b).length;

            return (
              <button
                key={b}
                onClick={() => onSelectBucket(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  selectedBucket === b
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <span>{b === 'all' ? (viewTab === 'active' ? 'All Active' : 'All Settled') : b}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20 text-current">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search customer, invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs sm:text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
          </div>

          {viewTab === 'active' ? (
            <select
              aria-label="Filter status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Active States</option>
              <option value="active">Active</option>
              <option value="paused">3-Day Hold</option>
              <option value="disputed">Disputed</option>
              <option value="promise">Promised</option>
            </select>
          ) : (
            <div className="px-2.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg whitespace-nowrap">
              Settled Archive
            </div>
          )}

          <select
            aria-label="Sort ledger"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer hidden sm:block"
          >
            <option value="dueDate">Overdue Days</option>
            <option value="amount">Amount</option>
            <option value="riskScore">Risk Score</option>
          </select>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            title="Sort Order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Structured Customer Ledger Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0D0E15] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#12131C] text-zinc-600 dark:text-zinc-400 font-mono text-xs uppercase tracking-wider divide-x divide-zinc-200 dark:divide-zinc-800/80">
                <th className="py-3.5 px-4 font-semibold min-w-[220px]">Customer / Company</th>
                <th className="py-3.5 px-4 font-semibold min-w-[140px]">Invoice Ref</th>
                <th className="py-3.5 px-4 font-semibold text-right min-w-[130px]">Amount</th>
                <th className="py-3.5 px-4 font-semibold min-w-[130px]">Ageing Bucket</th>
                <th className="py-3.5 px-4 font-semibold min-w-[140px]">Risk Tier</th>
                <th className="py-3.5 px-4 font-semibold min-w-[130px]">Status</th>
                <th className="py-3.5 px-4 font-semibold min-w-[180px]">Last Outreach</th>
                <th className="py-3.5 px-4 font-semibold text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 text-sm">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 text-sm">
                    {viewTab === 'settled'
                      ? 'No settled payments found in this filter.'
                      : 'No active overdue invoices found in this view.'}
                  </td>
                </tr>
              ) : (
                sorted.map((inv, idx) => {
                  const isPaid = inv.status === 'paid' || inv.currentStage === 'Done';

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => onRowClick(inv)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer divide-x divide-zinc-200 dark:divide-zinc-800/60"
                    >
                      {/* Customer / Company - Monogram avatar + details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <CompanyAvatar name={inv.customerCompany} logoUrl={inv.avatarUrl} size="md" />
                          <div className="min-w-0">
                            <div className="font-semibold text-zinc-900 dark:text-white text-sm truncate">
                              {inv.customerCompany}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                              {inv.customerName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Invoice Ref - Neutral styling without days overdue */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
                          {inv.invoiceNumber}
                        </span>
                      </td>

                      {/* Amount - Clean neutral tabular without INR label */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-sm sm:text-base text-zinc-900 dark:text-white tabular-nums">
                          {formatINR(inv.amount)}
                        </span>
                      </td>

                      {/* Ageing Bucket - Colored badge ONLY */}
                      <td className="py-3.5 px-4">
                        {getBucketBadge(inv.bucket)}
                      </td>

                      {/* Risk Tier - Colored badge ONLY */}
                      <td className="py-3.5 px-4">
                        {getRiskScoreBadge(inv)}
                      </td>

                      {/* Recovery State - Clean neutral text + indicator dot */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(inv.status, inv.currentStage)}
                      </td>

                      {/* Last Touch or Payment Settlement Record */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{payments.find((p) => p.invoiceId === inv.id || p.invoiceNumber === inv.invoiceNumber)?.paymentMethod || 'Bank Wire (RTGS)'}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">
                              Ref: {payments.find((p) => p.invoiceId === inv.id || p.invoiceNumber === inv.invoiceNumber)?.bankReference || 'Confirmed & Cleared'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                              {getChannelIcon(inv.lastTouch.channel)}
                              <span className="truncate max-w-[150px] text-xs font-medium" title={inv.lastTouch.action}>
                                {inv.lastTouch.action}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                              {inv.lastTouch.timestamp}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {inv.hasProofFile && (
                            <button
                              onClick={() => onViewProof(inv)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                              Proof
                            </button>
                          )}

                          {!isPaid ? (
                            <button
                              onClick={() => onMarkPaid(inv)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono font-bold">
                              Done ✓
                            </span>
                          )}

                          <button
                            onClick={() => onRowClick(inv)}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            title="Timeline"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
