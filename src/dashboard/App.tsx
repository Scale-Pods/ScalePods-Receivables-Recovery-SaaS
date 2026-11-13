import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  mockBusinessEntities, 
  mockKeyMetrics, 
  mockAgeingBuckets, 
  mockChannelPerformances, 
  mockFocusItems, 
  mockInvoices, 
  mockCustomers, 
  mockCashForecast 
} from './data/mockData';
import { 
  PlanTier, 
  AgeingBucketId, 
  Invoice, 
  CustomerProfile, 
  CustomerRiskTier,
  CadenceIntensity,
  FocusItem, 
  BusinessEntity,
  PaymentRecord
} from './types/dashboard';

import { 
  loadDashboardData, 
  recordPaymentInDb, 
  saveInvoiceInDb, 
  addInvoiceToDb, 
  saveCustomerInDb, 
  syncFocusItemsInDb 
} from '../lib/dashboardDb';

import { Sidebar, ActiveTab } from './components/Sidebar';
import { TopNavbar } from './components/Header';
import { ThreeQuestionsBar } from './components/ThreeQuestionsBar';
import { TodaysFocusBlock } from './components/TodaysFocusBlock';
import { KeyNumbersBlock } from './components/KeyNumbersBlock';
import { AgeingBucketsBlock } from './components/AgeingBucketsBlock';
import { StagesAndChannelsBlock } from './components/StagesAndChannelsBlock';
import { LedgerTableBlock } from './components/LedgerTableBlock';
import { ForecastAndTeamBlock } from './components/ForecastAndTeamBlock';
import { SequenceEngineBlock } from './components/SequenceEngineBlock';
import { InvoiceIntakeBlock } from './components/InvoiceIntakeBlock';
import { CustomerPortalModal } from './components/CustomerPortalModal';
import { PlanSettingsModal } from './components/PlanSettingsModal';
import { TimelineDrawer } from './components/TimelineDrawer';
import { ProofModal } from './components/ProofModal';
import { PauseModal, ChangeBucketModal, AnswerTicketModal } from './components/ActionModals';
import { User, Code2, Sun, Moon, LogOut } from 'lucide-react';
import { CustomerRiskModal } from './components/CustomerRiskModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { formatINR } from './utils/formatters';
import { UserAccount, UserRole, STORAGE_KEY_ROLE } from '../types/auth';
import { isDeveloperUser } from '../lib/roles';

export interface DashboardViewProps {
  currentUser?: UserAccount | null;
  onSignOut?: () => void;
  onSwitchToLanding?: () => void;
  onOpenUpgrade?: () => void;
}

export function DashboardView({
  currentUser,
  onSignOut,
  onSwitchToLanding,
  onOpenUpgrade,
}: DashboardViewProps = {}) {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(true);

  // Active Tab: 'overview' | 'ledger' | 'intake' | 'sequence' | 'simulator' | 'day22' | 'channels' | 'forecast'
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Strict Developer permission check (zero-DB changes: Email Whitelist / Admin domain)
  const isDevAllowed = isDeveloperUser(currentUser);

  // Role-based view state ('client' | 'developer')
  const [userRole, setUserRole] = useState<UserRole>(() => {
    if (!isDevAllowed) return 'client';
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ROLE) as UserRole;
      if (stored === 'client' || stored === 'developer') return stored;
      return 'developer';
    } catch {
      return 'developer';
    }
  });

  // Guard: if non-developer somehow has 'developer' role or sequence tab active, reset to 'client' & 'overview'
  useEffect(() => {
    if (!isDevAllowed) {
      if (userRole !== 'client') {
        setUserRole('client');
      }
      if (activeTab === 'sequence') {
        setActiveTab('overview');
      }
      try {
        localStorage.setItem(STORAGE_KEY_ROLE, 'client');
      } catch (err) {
        console.warn('Failed to reset role in localStorage', err);
      }
    }
  }, [isDevAllowed, userRole, activeTab]);

  const handleRoleChange = (newRole: UserRole) => {
    if (!isDevAllowed) return; // Prevent unauthorized role escalation
    setUserRole(newRole);
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, newRole);
    } catch (err) {
      console.warn('Failed to save role to localStorage', err);
    }
    if (newRole === 'developer') {
      setActiveTab('sequence');
    } else {
      setActiveTab('overview');
    }
  };

  // Keep activeTab aligned with role boundaries (21-Day Engine on dev side, core recovery on client side)
  useEffect(() => {
    if (userRole === 'developer' && activeTab !== 'sequence') {
      setActiveTab('sequence');
    } else if (userRole === 'client' && activeTab === 'sequence') {
      setActiveTab('overview');
    }
  }, [userRole]);

  // Plan Tier simulator (Free, Basic, Growth, Enterprise) — syncs with user account
  const [planTier, setPlanTier] = useState<PlanTier>(
    (currentUser?.planTier as PlanTier) || 'free'
  );

  useEffect(() => {
    if (currentUser?.planTier) {
      setPlanTier(currentUser.planTier as PlanTier);
    }
  }, [currentUser?.planTier]);

  // Customer Portal Modal
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState<boolean>(false);
  const [selectedInvoiceForPortal, setSelectedInvoiceForPortal] = useState<Invoice | null>(null);

  // Plan Settings Modal
  const [isPlanSettingsOpen, setIsPlanSettingsOpen] = useState<boolean>(false);

  // Dynamic entities list customized for user's company
  const entities = React.useMemo(() => {
    if (!currentUser?.companyName) return mockBusinessEntities;
    return [
      {
        id: 'ent-user-company',
        name: `${currentUser.companyName} (Main Ledger)`,
        region: 'India (Consolidated)',
        currency: '₹',
        totalOutstanding: 4285000,
        recoveredThisMonth: 924000,
        collectionRate: 78.4,
      },
      ...mockBusinessEntities.slice(1),
    ];
  }, [currentUser?.companyName]);

  // Business Entity
  const [selectedEntity, setSelectedEntity] = useState<BusinessEntity>(entities[0]);

  useEffect(() => {
    setSelectedEntity(entities[0]);
  }, [entities]);

  // Main data states (populated and persisted in database)
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [customers, setCustomers] = useState<Record<string, CustomerProfile>>(mockCustomers);
  const [focusItems, setFocusItems] = useState<FocusItem[]>(mockFocusItems);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<AgeingBucketId>('all');
  const [keyMetrics] = useState(mockKeyMetrics);
  const [isCloudDb, setIsCloudDb] = useState<boolean>(false);
  const [isDbLoading, setIsDbLoading] = useState<boolean>(true);

  // Load live data from Database (Supabase Cloud or Local Persistent DB)
  useEffect(() => {
    let isMounted = true;
    async function initDb() {
      setIsDbLoading(true);
      try {
        const userId = currentUser?.id || 'local_user';
        const res = await loadDashboardData(userId);
        if (isMounted) {
          setInvoices(res.invoices);
          setCustomers(res.customers);
          
          // Ensure any active invoice at or past Day 22 (>= 22 days) appears in Approvals tab
          const baseFocus = res.focusItems || [];
          const existingIds = new Set(baseFocus.map((f: FocusItem) => f.invoiceId));
          const overdue22Items: FocusItem[] = (res.invoices || [])
            .filter((inv: Invoice) => inv.status === 'active' && inv.daysOverdue >= 22 && !existingIds.has(inv.invoiceNumber))
            .map((inv: Invoice) => ({
              id: `foc-d22-${inv.id}`,
              type: 'approval' as const,
              title: `Day 22 Final Recovery Review: ${inv.invoiceNumber}`,
              customerName: inv.customerName,
              company: inv.customerCompany,
              invoiceId: inv.invoiceNumber,
              amount: inv.amount,
              badgeText: 'Overdue 22 Days Over',
              badgeVariant: 'rose' as const,
              description: `Invoice has passed 22 days overdue (final day of sequence). Autonomous cadence paused. Requires human approval for next action.`,
              actionPrimary: {
                label: 'Human Approval',
                actionKey: 'human_approval',
              },
              actionSecondary: {
                label: 'Extend 7 Days',
                actionKey: 'extend_day22_grace',
              },
              details: {
                daysOverdue: inv.daysOverdue,
              },
            }));

          setFocusItems([...overdue22Items, ...baseFocus]);
          setPayments(res.payments);
          setIsCloudDb(res.isCloud);
        }
      } catch (err) {
        console.error('Database load error:', err);
      } finally {
        if (isMounted) setIsDbLoading(false);
      }
    }
    initDb();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // Modals & Drawer states
  const [selectedInvoiceForTimeline, setSelectedInvoiceForTimeline] = useState<Invoice | null>(null);
  const [selectedInvoiceForProof, setSelectedInvoiceForProof] = useState<Invoice | null>(null);
  const [selectedInvoiceForPause, setSelectedInvoiceForPause] = useState<Invoice | null>(null);
  const [selectedInvoiceForBucket, setSelectedInvoiceForBucket] = useState<Invoice | null>(null);
  const [selectedInvoiceForTicket, setSelectedInvoiceForTicket] = useState<Invoice | null>(null);
  const [selectedCustomerForRisk, setSelectedCustomerForRisk] = useState<CustomerProfile | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toggle dark class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const addToast = (type: 'success' | 'info' | 'warning', title: string, message?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Celebration Confetti
  const triggerConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#FFFFFF', '#A1A1AA', '#10B981', '#F59E0B'],
    });
  };

  // Totals
  const totalOwed = invoices
    .filter((inv) => inv.status !== 'paid' && inv.currentStage !== 'Done')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalOverdue = invoices
    .filter((inv) => inv.status !== 'paid' && inv.currentStage !== 'Done' && inv.daysOverdue > 0)
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalRecovered = 924000 + payments
    .filter((p) => p.id !== 'pay-seed-1')
    .reduce((sum, p) => sum + p.amount, 0);

  // Ageing bucket stats recalculated dynamically
  const dynamicAgeingBuckets = mockAgeingBuckets.map((bucket) => {
    const bucketInvoices = invoices.filter(
      (inv) => inv.bucket === bucket.id && inv.status !== 'paid' && inv.currentStage !== 'Done'
    );
    const amount = bucketInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const count = bucketInvoices.length;
    const percentage = totalOwed > 0 ? Number(((amount / totalOwed) * 100).toFixed(1)) : 0;
    return {
      ...bucket,
      amount,
      customerCount: count,
      percentage,
    };
  });

  // Owner Action 1: Mark Paid & Record Payment in Database
  const handleMarkPaid = (invoice: Invoice) => {
    let updatedInv: Invoice = { ...invoice };
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          updatedInv = {
            ...inv,
            status: 'paid',
            currentStage: 'Done',
            timeline: [
              {
                id: `t-${Date.now()}`,
                timestamp: 'Just now',
                type: 'payment_verified',
                title: 'Payment Received — Leaves Bucket',
                description: `Payment of ${formatINR(inv.amount)} received. Invoice leaves ${inv.bucket.toUpperCase()} bucket.`,
              },
              ...inv.timeline,
            ],
          };
          return updatedInv;
        }
        return inv;
      })
    );

    // Update customer risk after payment
    let updatedCust: CustomerProfile | undefined;
    setCustomers((prev) => {
      const cust = prev[invoice.customerId];
      if (!cust) return prev;
      if (cust.isLockedByOwner) {
        updatedCust = {
          ...cust,
          totalPaidLifetime: cust.totalPaidLifetime + invoice.amount,
          lastUpdatedAfterPayment: `Payment of ${formatINR(invoice.amount)} received. Retained locked tier.`,
        };
      } else {
        const newScore = Math.min(100, cust.riskScore + 6);
        const newTier: CustomerRiskTier = newScore >= 80 ? 'reliable' : newScore >= 55 ? 'watch' : 'high_risk';
        const newCadence: CadenceIntensity = newTier === 'reliable' ? 'light' : newTier === 'watch' ? 'standard' : 'intensive';
        updatedCust = {
          ...cust,
          riskScore: newScore,
          riskTier: newTier,
          cadence: newCadence,
          totalPaidLifetime: cust.totalPaidLifetime + invoice.amount,
          lastUpdatedAfterPayment: `Updated after ${formatINR(invoice.amount)} payment (+6 pts for payment clearance).`,
        };
      }
      return {
        ...prev,
        [invoice.customerId]: updatedCust,
      };
    });

    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerCompany: invoice.customerCompany,
      amount: invoice.amount,
      paymentMethod: invoice.hasProofFile && invoice.proofFile?.bankReference.includes('NEFT') ? 'NEFT' : 'RTGS / Bank Wire',
      bankReference: invoice.proofFile?.bankReference || `UTR-${Date.now().toString().slice(-8)}`,
      proofUrl: invoice.proofFile?.filename,
      status: 'verified',
      settledAt: new Date().toISOString(),
    };

    setPayments((prev) => [paymentRecord, ...prev]);

    const remainingFocus = focusItems.filter((item) => item.invoiceId !== invoice.invoiceNumber);
    setFocusItems(remainingFocus);

    // Persist Payment, Invoice & Customer to Database
    const userId = currentUser?.id || 'local_user';
    recordPaymentInDb(userId, paymentRecord, updatedInv, updatedCust);
    syncFocusItemsInDb(userId, remainingFocus);

    if (selectedInvoiceForTimeline?.id === invoice.id) {
      setSelectedInvoiceForTimeline(updatedInv);
    }

    triggerConfetti();
    addToast(
      'success',
      `Payment Recorded: ${formatINR(invoice.amount)}`,
      `Database updated. #${invoice.invoiceNumber} archived to Settled. Bank UTR: ${paymentRecord.bankReference}`
    );
  };

  // Owner Action 2: View Proof
  const handleViewProof = (invoice: Invoice) => {
    setSelectedInvoiceForProof(invoice);
  };

  const handleConfirmVerification = (invoice: Invoice) => {
    handleMarkPaid(invoice);
    setSelectedInvoiceForProof(null);
  };

  // Owner Action 3: Pause / Resume
  const handleTogglePause = (invoice: Invoice) => {
    if (invoice.status === 'paused') {
      let updatedInv: Invoice = { ...invoice };
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === invoice.id) {
            updatedInv = {
              ...inv,
              status: 'active',
              timeline: [
                {
                  id: `t-${Date.now()}`,
                  timestamp: 'Just now',
                  type: 'owner_action',
                  title: 'Outreach Cadence Resumed',
                  description: 'Owner resumed automated sequence.',
                },
                ...inv.timeline,
              ],
            };
            return updatedInv;
          }
          return inv;
        })
      );
      const userId = currentUser?.id || 'local_user';
      saveInvoiceInDb(userId, updatedInv);
      addToast('info', 'Outreach Resumed', `Active dunning resumed for ${invoice.customerCompany}.`);
    } else {
      setSelectedInvoiceForPause(invoice);
    }
  };

  const handleConfirmPause = (invoice: Invoice, reason: string, duration: string) => {
    let updatedInv: Invoice = { ...invoice };
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          updatedInv = {
            ...inv,
            status: 'paused',
            timeline: [
              {
                id: `t-${Date.now()}`,
                timestamp: 'Just now',
                type: 'owner_action',
                title: `Outreach Paused (${duration})`,
                description: `Owner paused touches: ${reason}.`,
              },
              ...inv.timeline,
            ],
          };
          return updatedInv;
        }
        return inv;
      })
    );
    const userId = currentUser?.id || 'local_user';
    saveInvoiceInDb(userId, updatedInv);
    setSelectedInvoiceForPause(null);
    addToast('warning', `Outreach Paused (${duration})`, `${invoice.customerCompany}: ${reason}`);
  };

  // Owner Action 4: Resend Notice
  const handleResendNotice = (invoice: Invoice) => {
    let updatedInv: Invoice = { ...invoice };
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          updatedInv = {
            ...inv,
            lastTouch: {
              channel: 'whatsapp',
              action: 'Manual high-priority statement nudge dispatched',
              timestamp: 'Just now',
            },
            timeline: [
              {
                id: `t-${Date.now()}`,
                timestamp: 'Just now',
                channel: 'whatsapp',
                type: 'whatsapp_sent',
                title: 'High-Priority Multi-Channel Nudge Dispatched',
                description: 'Statement sent to primary contact.',
              },
              ...inv.timeline,
            ],
          };
          return updatedInv;
        }
        return inv;
      })
    );
    const userId = currentUser?.id || 'local_user';
    saveInvoiceInDb(userId, updatedInv);
    addToast('success', 'Nudge Dispatched', `Urgent notice sent to ${invoice.customerName}.`);
  };

  // Owner Action 5: Change Bucket
  const handleChangeBucket = (invoice: Invoice) => {
    setSelectedInvoiceForBucket(invoice);
  };

  const handleConfirmChangeBucket = (invoice: Invoice, newBucket: Invoice['bucket']) => {
    const toneMap = {
      'early': 'Friendly & Consultative (0–14d)',
      '15+': 'Clear & Firm (15–29d)',
      '30+': 'Urgent Escalation (30–59d)',
      '60+': 'Executive Hold / Human Review (60d+)',
    };

    let updatedInv: Invoice = { ...invoice };
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          updatedInv = {
            ...inv,
            bucket: newBucket,
            bucketTone: toneMap[newBucket],
            timeline: [
              {
                id: `t-${Date.now()}`,
                timestamp: 'Just now',
                type: 'bucket_move',
                title: `Moved to Bucket: ${newBucket.toUpperCase()}`,
                description: `Owner moved invoice to ${newBucket.toUpperCase()} bucket (${toneMap[newBucket]}).`,
              },
              ...inv.timeline,
            ],
          };
          return updatedInv;
        }
        return inv;
      })
    );
    const userId = currentUser?.id || 'local_user';
    saveInvoiceInDb(userId, updatedInv);
    setSelectedInvoiceForBucket(null);
    addToast('info', 'Bucket Reassigned', `Invoice #${invoice.invoiceNumber} moved to ${newBucket.toUpperCase()}.`);
  };

  // Owner Action 6: Answer Ticket
  const handleAnswerTicket = (invoice: Invoice) => {
    setSelectedInvoiceForTicket(invoice);
  };

  const handleConfirmSendReply = (invoice: Invoice, replyText: string) => {
    let updatedInv: Invoice = { ...invoice };
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          updatedInv = {
            ...inv,
            hasTicket: false,
            timeline: [
              {
                id: `t-${Date.now()}`,
                timestamp: 'Just now',
                channel: 'email',
                type: 'owner_action',
                title: 'Ticket Resolved & PDF Re-issued',
                description: `Sent response with revised PO#: "${replyText.substring(0, 60)}..."`,
              },
              ...inv.timeline,
            ],
          };
          return updatedInv;
        }
        return inv;
      })
    );
    const remainingFocus = focusItems.filter((item) => item.invoiceId !== invoice.invoiceNumber);
    setFocusItems(remainingFocus);

    const userId = currentUser?.id || 'local_user';
    saveInvoiceInDb(userId, updatedInv);
    syncFocusItemsInDb(userId, remainingFocus);

    setSelectedInvoiceForTicket(null);
    addToast('success', 'Ticket Resolved', `Response & corrected invoice PDF sent to ${invoice.customerCompany}.`);
  };

  // Owner Action 7: Approve Settlement
  const handleApproveSettlement = (invoice: Invoice) => {
    let updatedInv: Invoice = { ...invoice };
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          updatedInv = {
            ...inv,
            settlementOffer: inv.settlementOffer ? { ...inv.settlementOffer, status: 'accepted' } : undefined,
            timeline: [
              {
                id: `t-${Date.now()}`,
                timestamp: 'Just now',
                type: 'owner_action',
                title: 'Owner Approved 4.5% Settlement Offer',
                description: `Authorized discounted payment of ₹2,29,200 via RTGS today.`,
              },
              ...inv.timeline,
            ],
          };
          return updatedInv;
        }
        return inv;
      })
    );
    const remainingFocus = focusItems.filter((item) => item.invoiceId !== invoice.invoiceNumber);
    setFocusItems(remainingFocus);

    const userId = currentUser?.id || 'local_user';
    saveInvoiceInDb(userId, updatedInv);
    syncFocusItemsInDb(userId, remainingFocus);

    triggerConfetti();
    addToast(
      'success',
      'Settlement Offer Approved',
      `Nexora Infotech authorized for ₹2,29,200 payment today. Saved to database.`
    );
  };

  // Owner Action 8: Customer Risk Profile Control
  const handleInspectRisk = (customer: CustomerProfile) => {
    setSelectedCustomerForRisk(customer);
  };

  const handleSaveRiskProfile = (
    customerId: string, 
    newTier: CustomerRiskTier, 
    newCadence: CadenceIntensity, 
    isLocked: boolean, 
    lockedReason: string
  ) => {
    let updatedCust: CustomerProfile | undefined;
    setCustomers((prev) => {
      const existing = prev[customerId];
      if (!existing) return prev;
      updatedCust = {
        ...existing,
        riskTier: newTier,
        cadence: newCadence,
        isLockedByOwner: isLocked,
        lockedReason: isLocked ? lockedReason : undefined,
        whyExplanation: isLocked 
          ? `Owner manually locked to ${newTier.toUpperCase()} (${newCadence.toUpperCase()} cadence): ${lockedReason || 'Manual override'}`
          : existing.whyExplanation,
      };
      return {
        ...prev,
        [customerId]: updatedCust,
      };
    });

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.customerId === customerId) {
          const invUpdated = {
            ...inv,
            riskTier: newTier,
            cadence: newCadence,
            isLockedByOwner: isLocked,
            timeline: [
              {
                id: `t-${Date.now()}`,
                timestamp: 'Just now',
                type: 'owner_action' as const,
                title: `Risk Tier Updated to ${newTier.toUpperCase()} (${newCadence.toUpperCase()})`,
                description: isLocked 
                  ? `Owner locked customer to ${newTier.toUpperCase()}. Automatic updates frozen.`
                  : `Owner moved customer to ${newTier.toUpperCase()}.`,
              },
              ...inv.timeline,
            ],
          };
          const userId = currentUser?.id || 'local_user';
          saveInvoiceInDb(userId, invUpdated);
          return invUpdated;
        }
        return inv;
      })
    );

    const userId = currentUser?.id || 'local_user';
    if (updatedCust) {
      saveCustomerInDb(userId, updatedCust);
    }

    setSelectedCustomerForRisk(null);
    triggerConfetti();
    addToast(
      'success',
      `Customer Risk Updated: ${newTier.toUpperCase()}`,
      `Cadence set to ${newCadence.toUpperCase()}. Saved to database.`
    );
  };

  // Focus action dispatcher
  const handleFocusAction = (item: FocusItem, actionKey: string) => {
    const targetInvoice = invoices.find((inv) => inv.invoiceNumber === item.invoiceId);

    if (actionKey === 'approve_settlement') {
      if (targetInvoice) handleApproveSettlement(targetInvoice);
    } else if (actionKey === 'confirm_unmatched_payment') {
      if (targetInvoice) handleMarkPaid(targetInvoice);
    } else if (actionKey === 'view_wire_slip') {
      if (targetInvoice) handleViewProof(targetInvoice);
    } else if (actionKey === 'reissue_with_po') {
      if (targetInvoice) {
        handleConfirmSendReply(
          targetInvoice,
          'Attached is your updated invoice PDF with PO #PO-99214 included for automated disbursement.'
        );
      }
    } else if (actionKey === 'resolve_dispute_resume') {
      if (targetInvoice) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === targetInvoice.id
              ? {
                  ...inv,
                  status: 'active',
                  hasDispute: false,
                  timeline: [
                    {
                      id: `t-${Date.now()}`,
                      timestamp: 'Just now',
                      type: 'owner_action',
                      title: 'Dispute Resolved: QA Proof Delivered',
                      description: 'Owner sent QA acceptance report and resumed outreach cadence.',
                    },
                    ...inv.timeline,
                  ],
                }
              : inv
          )
        );
        setFocusItems((prev) => prev.filter((f) => f.id !== item.id));
        addToast('success', 'Dispute Resolved', 'QA sign-off sent to Apex Cloud. Outreach resumed.');
      }
    } else if (actionKey === 'escalate_voice_call') {
      if (targetInvoice) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === targetInvoice.id
              ? {
                  ...inv,
                  timeline: [
                    {
                      id: `t-${Date.now()}`,
                      timestamp: 'Just now',
                      channel: 'voice',
                      type: 'voice_call',
                      title: 'Priority Voice AI Escalation Queued',
                      description: 'AI Voice assistant queued to call CFO regarding broken wire promise.',
                    },
                    ...inv.timeline,
                  ],
                }
              : inv
          )
        );
        setFocusItems((prev) => prev.filter((f) => f.id !== item.id));
        addToast('warning', 'Voice Call Queued', 'Voice AI is calling Rajesh Sharma (Managing Director).');
      }
    } else if (actionKey === 'human_approval' || actionKey === 'serve_day22_notice') {
      if (targetInvoice) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === targetInvoice.id
              ? {
                  ...inv,
                  status: 'paused',
                  timeline: [
                    {
                      id: `t-${Date.now()}`,
                      timestamp: 'Just now',
                      channel: 'email',
                      type: 'owner_action',
                      title: 'Human Approval Granted',
                      description: 'Owner approved final escalation step for Day 22 overdue receivable.',
                    },
                    ...inv.timeline,
                  ],
                }
              : inv
          )
        );
      }
      setFocusItems((prev) => prev.filter((f) => f.id !== item.id));
      triggerConfetti();
      addToast('success', 'Human Approval Recorded', `Approved next step for invoice ${item.invoiceId}.`);
    } else if (actionKey === 'extend_day22_grace') {
      if (targetInvoice) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === targetInvoice.id
              ? {
                  ...inv,
                  timeline: [
                    {
                      id: `t-${Date.now()}`,
                      timestamp: 'Just now',
                      type: 'owner_action',
                      title: '7-Day Grace Extension Granted',
                      description: 'Owner approved a 7-day grace extension.',
                    },
                    ...inv.timeline,
                  ],
                }
              : inv
          )
        );
      }
      setFocusItems((prev) => prev.filter((f) => f.id !== item.id));
      addToast('info', 'Grace Extension Granted', `7-day extension recorded for ${item.invoiceId}.`);
    } else {
      setFocusItems((prev) => prev.filter((f) => f.id !== item.id));
      addToast('info', 'Action Completed', `${item.title} has been processed.`);
    }
  };

  const handleUpgradePrompt = (tier: PlanTier = 'growth') => {
    if (onOpenUpgrade) {
      onOpenUpgrade();
    } else {
      setPlanTier(tier);
      addToast('success', `Plan switched to ${tier.toUpperCase()}`, 'Features for this tier are now unlocked.');
    }
  };

  // Smart Intake: Add newly parsed or manual invoice
  const handleAddInvoice = (newInv: Partial<Invoice>) => {
    const invoiceId = `inv-${Date.now()}`;
    const invNumber = newInv.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`;
    const fullInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber: invNumber,
      customerId: `cust-${Date.now()}`,
      customerName: newInv.customerName || 'Accounts Payable',
      customerEmail: newInv.customerEmail || 'ap@company.in',
      customerPhone: newInv.customerPhone || '+91 98200 12345',
      customerCompany: newInv.customerCompany || 'New Client Pvt Ltd',
      amount: newInv.amount || 50000,
      currency: newInv.currency || '₹',
      dueDate: newInv.dueDate || new Date().toISOString().split('T')[0],
      daysOverdue: newInv.daysOverdue || 5,
      bucket: newInv.bucket || 'early',
      bucketTone: newInv.bucket === '60+' ? 'Urgent Daily Call' : newInv.bucket === '30+' ? 'Firm with Calls' : newInv.bucket === '15+' ? 'Firm' : 'Friendly',
      status: 'active',
      riskScore: newInv.bucket === '60+' ? 35 : newInv.bucket === '30+' ? 58 : 82,
      riskTier: newInv.bucket === '60+' ? 'high_risk' : newInv.bucket === '30+' ? 'watch' : 'reliable',
      cadence: newInv.cadence || 'standard',
      currentStage: newInv.currentStage || 'Friendly',
      lastTouch: {
        channel: 'email',
        action: 'Enrolled in 21-Day Autonomous Cadence',
        timestamp: 'Just now',
      },
      hasProofFile: false,
      hasTicket: false,
      hasDispute: false,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: 'Just now',
          type: 'invoice_due',
          title: 'Enrolled in Recovery Sequence',
          description: `Invoice ${invNumber} enrolled in ${newInv.bucket?.toUpperCase()} ageing bucket. Autonomous sequence active.`,
        }
      ],
    };

    setInvoices((prev) => [fullInvoice, ...prev]);

    // If invoice reached Day 22 (>= 22 days overdue), queue it in Approvals with 'Overdue 22 Days Over' tag
    if (fullInvoice.daysOverdue >= 22) {
      const day22FocusItem: FocusItem = {
        id: `foc-d22-${fullInvoice.id}`,
        type: 'approval',
        title: `Day 22 Final Recovery Review: ${fullInvoice.invoiceNumber}`,
        customerName: fullInvoice.customerName,
        company: fullInvoice.customerCompany,
        invoiceId: fullInvoice.invoiceNumber,
        amount: fullInvoice.amount,
        badgeText: 'Overdue 22 Days Over',
        badgeVariant: 'rose',
        description: `Invoice has passed 22 days overdue (final day of sequence). Autonomous cadence paused. Requires human approval for next action.`,
        actionPrimary: {
          label: 'Human Approval',
          actionKey: 'human_approval',
        },
        actionSecondary: {
          label: 'Extend 7 Days',
          actionKey: 'extend_day22_grace',
        },
        details: {
          daysOverdue: fullInvoice.daysOverdue,
        },
      };
      setFocusItems((prev) => [day22FocusItem, ...prev]);
    }

    // Persist new invoice to Database
    const userId = currentUser?.id || 'local_user';
    addInvoiceToDb(userId, fullInvoice);

    triggerConfetti();
    addToast(
      'success', 
      `Saved to Database: ${fullInvoice.invoiceNumber}`, 
      `${fullInvoice.customerCompany} entered ${fullInvoice.bucket.toUpperCase()} bucket. Persisted in database.`
    );
    setActiveTab('ledger');
  };

  // Customer Portal: Payment simulation
  const handleCustomerPaymentSuccess = (invoice: Invoice, amountPaid: number, method: string) => {
    if (amountPaid >= invoice.amount) {
      handleMarkPaid(invoice);
      addToast('success', 'Full Payment Cleared via Razorpay', `${formatINR(amountPaid)} confirmed via ${method}. Outstanding: ₹0.`);
    } else {
      const newBalance = invoice.amount - amountPaid;
      let updatedInv: Invoice = { ...invoice };
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === invoice.id) {
            updatedInv = {
              ...inv,
              amount: newBalance,
              timeline: [
                {
                  id: `tl-${Date.now()}`,
                  timestamp: 'Just now',
                  type: 'payment_verified',
                  title: `Part Payment Received (${formatINR(amountPaid)})`,
                  description: `Customer paid ${formatINR(amountPaid)} via Razorpay (${method}). Outreach paused for 3 days; remaining balance: ${formatINR(newBalance)}.`,
                },
                ...inv.timeline,
              ],
            };
            return updatedInv;
          }
          return inv;
        })
      );

      const partPayment: PaymentRecord = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerCompany: invoice.customerCompany,
        amount: amountPaid,
        paymentMethod: method || 'Razorpay UPI',
        bankReference: `RZP-${Date.now().toString().slice(-8)}`,
        status: 'verified',
        settledAt: new Date().toISOString(),
      };
      setPayments((prev) => [partPayment, ...prev]);

      const userId = currentUser?.id || 'local_user';
      saveInvoiceInDb(userId, updatedInv);
      recordPaymentInDb(userId, partPayment, updatedInv);

      addToast('info', 'Part Payment Recorded', `${formatINR(amountPaid)} recorded in database. Remaining balance: ${formatINR(newBalance)}.`);
    }
  };

  // Customer Portal: "I Have Paid" 3-day hold
  const handleReportPaidHold = (invoice: Invoice, proofNotes: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id
          ? {
              ...inv,
              status: 'paused',
              timeline: [
                {
                  id: `tl-${Date.now()}`,
                  timestamp: 'Just now',
                  type: 'customer_reply',
                  title: 'Customer Reported "I Have Paid" — 3-Day Verification Hold',
                  description: `${proofNotes}. Reminders paused for 3 working days pending owner bank check.`,
                },
                ...inv.timeline,
              ],
            }
          : inv
      )
    );

    setFocusItems((prev) => [
      {
        id: `foc-${Date.now()}`,
        type: 'payment_confirmation',
        title: 'Verify Bank NEFT / RTGS Credit',
        customerName: invoice.customerName,
        company: invoice.customerCompany,
        invoiceId: invoice.invoiceNumber,
        amount: invoice.amount,
        badgeText: '3-Day Hold Active',
        badgeVariant: 'amber',
        description: `Customer submitted UTR payment on customer portal. Check bank credit or resume follow-up.`,
        actionPrimary: { label: 'Confirm UTR Paid', actionKey: 'verify_paid' },
        actionSecondary: { label: 'Reject & Resume', actionKey: 'reject_hold' },
      },
      ...prev,
    ]);

    addToast('warning', '3-Day Verification Hold Activated', `Automated outreach paused for ${invoice.customerCompany}.`);
  };

  // Customer Portal: Remittance Proof upload
  const handleUploadProofFromPortal = (invoice: Invoice, fileName: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id
          ? {
              ...inv,
              hasProofFile: true,
              proofFile: {
                id: `prf-${Date.now()}`,
                filename: fileName,
                fileType: 'pdf',
                uploadDate: 'Just now',
                amountReported: invoice.amount,
                bankReference: 'Customer Portal Upload',
                customerName: invoice.customerName,
                status: 'pending_review',
              },
              timeline: [
                {
                  id: `tl-${Date.now()}`,
                  timestamp: 'Just now',
                  type: 'proof_uploaded',
                  title: 'Remittance Proof File Uploaded',
                  description: `Customer attached ${fileName} (Status: Received). Awaiting Razorpay/bank reconciliation.`,
                },
                ...inv.timeline,
              ],
            }
          : inv
      )
    );
    addToast('success', 'Proof Received', `${fileName} attached to ${invoice.invoiceNumber}.`);
  };

  // Customer Portal: Dispute ticket
  const handleRaiseDisputeFromPortal = (invoice: Invoice, reason: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id
          ? {
              ...inv,
              hasDispute: true,
              disputeReason: reason,
              status: 'disputed',
              timeline: [
                {
                  id: `tl-${Date.now()}`,
                  timestamp: 'Just now',
                  type: 'dispute_opened',
                  title: 'Customer Dispute Raised',
                  description: `Customer filed ticket: "${reason}". Disputed balance isolated.`,
                },
                ...inv.timeline,
              ],
            }
          : inv
      )
    );
    addToast('warning', 'Dispute Ticket Raised', `Outreach paused on disputed portion for ${invoice.customerCompany}.`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#FAFAFB] dark:bg-[#07080D] text-zinc-900 dark:text-zinc-100 transition-colors duration-150">
      
      {/* Left Sidebar Navigation (Replaces overcrowded horizontal navbar) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        planTier={planTier}
        setPlanTier={setPlanTier}
        isDark={isDark}
        setIsDark={setIsDark}
        selectedEntity={selectedEntity}
        setSelectedEntity={setSelectedEntity}
        entities={mockBusinessEntities}
        pendingActionsCount={focusItems.length}
        userRole={userRole}
        isDevAllowed={isDevAllowed}
        onRoleChange={isDevAllowed ? handleRoleChange : undefined}
        onOpenCustomerPortal={() => {
          setSelectedInvoiceForPortal(invoices[0]);
          setIsCustomerPortalOpen(true);
        }}
        onOpenPlanSettings={() => setIsPlanSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Minimal Uncluttered Top Navbar with Live User Capsule & Landing Page switch */}
        <TopNavbar
          activeTab={activeTab}
          planTier={planTier}
          setPlanTier={setPlanTier}
          selectedEntity={selectedEntity}
          setSelectedEntity={setSelectedEntity}
          entities={entities}
          pendingActionsCount={focusItems.length}
          currentUser={currentUser}
          userRole={userRole}
          isDevAllowed={isDevAllowed}
          onRoleChange={isDevAllowed ? handleRoleChange : undefined}
          onOpenCustomerPortal={() => {
            setSelectedInvoiceForPortal(invoices[0]);
            setIsCustomerPortalOpen(true);
          }}
          onOpenPlanSettings={() => setIsPlanSettingsOpen(true)}
          onSwitchToLanding={onSwitchToLanding}
          onSignOut={onSignOut}
          onOpenUpgrade={onOpenUpgrade}
        />

        {/* Scrollable Views Body */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* VIEW 1: MAIN CLEAN DASHBOARD (Key Metrics + Customer Table) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Row */}
              <ThreeQuestionsBar
                totalOwed={totalOwed}
                totalOverdue={totalOverdue}
                totalRecovered={totalRecovered}
                activeWorkflowsCount={42}
                touchesTodayCount={14}
                pendingOwnerItemsCount={focusItems.length}
                onViewLedger={() => setActiveTab('ledger')}
                onViewChannels={() => setActiveTab('forecast')}
                onScrollToFocus={() => setActiveTab('focus')}
              />

              {/* Customer Table */}
              <LedgerTableBlock
                invoices={invoices}
                payments={payments}
                selectedBucket={selectedBucket}
                onSelectBucket={setSelectedBucket}
                planTier={planTier}
                onRowClick={(inv) => setSelectedInvoiceForTimeline(inv)}
                onMarkPaid={handleMarkPaid}
                onViewProof={handleViewProof}
                onPauseResume={handleTogglePause}
                onResendNotice={handleResendNotice}
                onChangeBucket={handleChangeBucket}
                onAnswerTicket={handleAnswerTicket}
                onInspectRisk={(inv) => {
                  const cust = customers[inv.customerId];
                  if (cust) setSelectedCustomerForRisk(cust);
                }}
              />
            </div>
          )}

          {/* VIEW: STANDALONE RECOVERY LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-6">
              <LedgerTableBlock
                invoices={invoices}
                payments={payments}
                selectedBucket={selectedBucket}
                onSelectBucket={setSelectedBucket}
                planTier={planTier}
                onRowClick={(inv) => setSelectedInvoiceForTimeline(inv)}
                onMarkPaid={handleMarkPaid}
                onViewProof={handleViewProof}
                onPauseResume={handleTogglePause}
                onResendNotice={handleResendNotice}
                onChangeBucket={handleChangeBucket}
                onAnswerTicket={handleAnswerTicket}
                onInspectRisk={(inv) => {
                  const cust = customers[inv.customerId];
                  if (cust) setSelectedCustomerForRisk(cust);
                }}
              />
            </div>
          )}

          {/* VIEW: APPROVALS & TODAY'S FOCUS */}
          {activeTab === 'focus' && (
            <div>
              <TodaysFocusBlock
                items={focusItems}
                planTier={planTier}
                onActionClick={handleFocusAction}
                onUpgradePrompt={() => handleUpgradePrompt('growth')}
                onViewDetails={(item) => {
                  const inv = invoices.find((i) => i.invoiceNumber === item.invoiceId);
                  if (inv) setSelectedInvoiceForTimeline(inv);
                }}
              />
            </div>
          )}

          {/* VIEW 2: SMART INVOICE INTAKE & OCR (BRD Feature #2) */}
          {activeTab === 'intake' && (
            <div>
              <InvoiceIntakeBlock
                planTier={planTier}
                currentUser={currentUser}
                onAddInvoice={handleAddInvoice}
                onUpgradePrompt={handleUpgradePrompt}
              />
            </div>
          )}

          {/* VIEW 3: 21-DAY RECOVERY ENGINE (BRD Feature #5) - STRICTLY RESTRICTED TO DEVELOPERS */}
          {activeTab === 'sequence' && isDevAllowed && (
            <div>
              <SequenceEngineBlock
                planTier={planTier}
                onUpgradePrompt={handleUpgradePrompt}
              />
            </div>
          )}

          {/* VIEW 6: FORECAST, STAGES & CHANNELS */}
          {activeTab === 'forecast' && (
            <div className="space-y-6">
              <ForecastAndTeamBlock
                forecast={mockCashForecast}
                entities={mockBusinessEntities}
                selectedEntity={selectedEntity}
                onSelectEntity={setSelectedEntity}
                planTier={planTier}
                onUpgradePrompt={() => handleUpgradePrompt('growth')}
              />

              <StagesAndChannelsBlock
                channels={mockChannelPerformances}
                planTier={planTier}
                onUpgradePrompt={() => handleUpgradePrompt('basic')}
                onFilterByStage={() => {
                  setSelectedBucket('all');
                  setActiveTab('overview');
                }}
              />
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#07080D] py-4 text-xs text-zinc-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono">
              <img
                src={isDark ? '/scalepods-logo-white.png' : '/scalepods-logo-dark.png'}
                alt="ScalePods"
                className="h-3.5 w-auto object-contain"
              />
              <span>• Receivables Recovery System</span>
            </div>
          </div>
        </footer>
        </div>

      </div>

      {/* Slide-out Timeline & Profile Drawer */}
      <TimelineDrawer
        invoice={selectedInvoiceForTimeline}
        customer={selectedInvoiceForTimeline ? customers[selectedInvoiceForTimeline.customerId] : null}
        planTier={planTier}
        onClose={() => setSelectedInvoiceForTimeline(null)}
        onMarkPaid={handleMarkPaid}
        onViewProof={handleViewProof}
        onPauseResume={handleTogglePause}
        onResendNotice={handleResendNotice}
        onChangeBucket={handleChangeBucket}
        onAnswerTicket={handleAnswerTicket}
        onInspectRisk={(cust) => setSelectedCustomerForRisk(cust)}
        onApproveSettlement={handleApproveSettlement}
      />

      {/* Wire Remittance Proof Modal */}
      <ProofModal
        invoice={selectedInvoiceForProof}
        proof={selectedInvoiceForProof?.proofFile || null}
        onClose={() => setSelectedInvoiceForProof(null)}
        onConfirmVerification={handleConfirmVerification}
      />

      {/* Pause Outreach Modal */}
      <PauseModal
        invoice={selectedInvoiceForPause}
        onClose={() => setSelectedInvoiceForPause(null)}
        onConfirmPause={handleConfirmPause}
      />

      {/* Change Bucket Modal */}
      <ChangeBucketModal
        invoice={selectedInvoiceForBucket}
        onClose={() => setSelectedInvoiceForBucket(null)}
        onConfirmChangeBucket={handleConfirmChangeBucket}
      />

      {/* Answer Ticket Modal */}
      <AnswerTicketModal
        invoice={selectedInvoiceForTicket}
        onClose={() => setSelectedInvoiceForTicket(null)}
        onConfirmSendReply={handleConfirmSendReply}
      />

      {/* Customer Risk & Tone Control Modal */}
      <CustomerRiskModal
        customer={selectedCustomerForRisk}
        onClose={() => setSelectedCustomerForRisk(null)}
        onSaveRiskProfile={handleSaveRiskProfile}
      />

      {/* Customer Facing Payment Page Portal Modal (Feature #10) */}
      {isCustomerPortalOpen && (
        <CustomerPortalModal
          invoice={selectedInvoiceForPortal || invoices[0]}
          onClose={() => {
            setIsCustomerPortalOpen(false);
            setSelectedInvoiceForPortal(null);
          }}
          onPaymentSuccess={handleCustomerPaymentSuccess}
          onReportPaidHold={handleReportPaidHold}
          onUploadProof={handleUploadProofFromPortal}
          onRaiseDispute={handleRaiseDisputeFromPortal}
        />
      )}

      {/* Plan Settings, Quotas & Safety Modal (Feature #13) */}
      {isPlanSettingsOpen && (
        <PlanSettingsModal
          currentTier={planTier}
          onSelectTier={(_tier) => {
            setIsPlanSettingsOpen(false);
            if (onOpenUpgrade) {
              onOpenUpgrade();
            }
          }}
          onClose={() => setIsPlanSettingsOpen(false)}
        />
      )}

      {/* Notification Toast Stack */}
      <NotificationToast toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}

export { DashboardView as App };
export default DashboardView;
