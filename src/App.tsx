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
  BusinessEntity 
} from './types/dashboard';

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
import { OmnichannelSimulatorBlock } from './components/OmnichannelSimulatorBlock';
import { Day22ApprovalsBlock } from './components/Day22ApprovalsBlock';
import { CustomerPortalModal } from './components/CustomerPortalModal';
import { PlanSettingsModal } from './components/PlanSettingsModal';
import { TimelineDrawer } from './components/TimelineDrawer';
import { ProofModal } from './components/ProofModal';
import { PauseModal, ChangeBucketModal, AnswerTicketModal } from './components/ActionModals';
import { CustomerRiskModal } from './components/CustomerRiskModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { formatINR } from './utils/formatters';

export function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(true);

  // Active Tab: 'overview' | 'ledger' | 'intake' | 'sequence' | 'simulator' | 'day22' | 'channels' | 'forecast'
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Plan Tier simulator (Free, Basic, Growth, Enterprise)
  const [planTier, setPlanTier] = useState<PlanTier>('growth');

  // Customer Portal Modal
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState<boolean>(false);
  const [selectedInvoiceForPortal, setSelectedInvoiceForPortal] = useState<Invoice | null>(null);

  // Plan Settings Modal
  const [isPlanSettingsOpen, setIsPlanSettingsOpen] = useState<boolean>(false);

  // Business Entity
  const [selectedEntity, setSelectedEntity] = useState<BusinessEntity>(mockBusinessEntities[0]);

  // Main data states
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [customers, setCustomers] = useState<Record<string, CustomerProfile>>(mockCustomers);
  const [focusItems, setFocusItems] = useState<FocusItem[]>(mockFocusItems);
  const [selectedBucket, setSelectedBucket] = useState<AgeingBucketId>('all');
  const [keyMetrics] = useState(mockKeyMetrics);

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

  const totalRecovered = 924000 + (mockInvoices.length - invoices.filter(i => i.status !== 'paid').length) * 150000;

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

  // Owner Action 1: Mark Paid
  const handleMarkPaid = (invoice: Invoice) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          return {
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
        }
        return inv;
      })
    );

    // Update customer risk after payment
    setCustomers((prev) => {
      const cust = prev[invoice.customerId];
      if (!cust) return prev;
      if (cust.isLockedByOwner) {
        return {
          ...prev,
          [invoice.customerId]: {
            ...cust,
            totalPaidLifetime: cust.totalPaidLifetime + invoice.amount,
            lastUpdatedAfterPayment: `Payment of ${formatINR(invoice.amount)} received. Retained locked tier.`,
          }
        };
      }
      const newScore = Math.min(100, cust.riskScore + 6);
      const newTier: CustomerRiskTier = newScore >= 80 ? 'reliable' : newScore >= 55 ? 'watch' : 'high_risk';
      const newCadence: CadenceIntensity = newTier === 'reliable' ? 'light' : newTier === 'watch' ? 'standard' : 'intensive';
      return {
        ...prev,
        [invoice.customerId]: {
          ...cust,
          riskScore: newScore,
          riskTier: newTier,
          cadence: newCadence,
          totalPaidLifetime: cust.totalPaidLifetime + invoice.amount,
          lastUpdatedAfterPayment: `Updated after ${formatINR(invoice.amount)} payment (+6 pts for payment clearance).`,
        }
      };
    });

    setFocusItems((prev) => prev.filter((item) => item.invoiceId !== invoice.invoiceNumber));

    if (selectedInvoiceForTimeline?.id === invoice.id) {
      setSelectedInvoiceForTimeline((prev) =>
        prev ? { ...prev, status: 'paid', currentStage: 'Done' } : null
      );
    }

    triggerConfetti();
    addToast(
      'success',
      `Payment Received: ${formatINR(invoice.amount)}`,
      `Invoice #${invoice.invoiceNumber} leaves bucket. Customer score updated.`
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
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === invoice.id) {
            return {
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
          }
          return inv;
        })
      );
      addToast('info', 'Outreach Resumed', `Active dunning resumed for ${invoice.customerCompany}.`);
    } else {
      setSelectedInvoiceForPause(invoice);
    }
  };

  const handleConfirmPause = (invoice: Invoice, reason: string, duration: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          return {
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
        }
        return inv;
      })
    );
    setSelectedInvoiceForPause(null);
    addToast('warning', `Outreach Paused (${duration})`, `${invoice.customerCompany}: ${reason}`);
  };

  // Owner Action 4: Resend Notice
  const handleResendNotice = (invoice: Invoice) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          return {
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
        }
        return inv;
      })
    );
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
      '60+': 'Executive Hold / Legal (60d+)',
    };

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          return {
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
        }
        return inv;
      })
    );
    setSelectedInvoiceForBucket(null);
    addToast('info', 'Bucket Reassigned', `Invoice #${invoice.invoiceNumber} moved to ${newBucket.toUpperCase()}.`);
  };

  // Owner Action 6: Answer Ticket
  const handleAnswerTicket = (invoice: Invoice) => {
    setSelectedInvoiceForTicket(invoice);
  };

  const handleConfirmSendReply = (invoice: Invoice, replyText: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          return {
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
        }
        return inv;
      })
    );
    setFocusItems((prev) => prev.filter((item) => item.invoiceId !== invoice.invoiceNumber));
    setSelectedInvoiceForTicket(null);
    addToast('success', 'Ticket Resolved', `Response & corrected invoice PDF sent to ${invoice.customerCompany}.`);
  };

  // Owner Action 7: Approve Settlement
  const handleApproveSettlement = (invoice: Invoice) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          return {
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
        }
        return inv;
      })
    );
    setFocusItems((prev) => prev.filter((item) => item.invoiceId !== invoice.invoiceNumber));
    triggerConfetti();
    addToast(
      'success',
      'Settlement Offer Approved',
      `Nexora Infotech authorized for ₹2,29,200 payment today.`
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
    setCustomers((prev) => {
      const existing = prev[customerId];
      if (!existing) return prev;
      return {
        ...prev,
        [customerId]: {
          ...existing,
          riskTier: newTier,
          cadence: newCadence,
          isLockedByOwner: isLocked,
          lockedReason: isLocked ? lockedReason : undefined,
          whyExplanation: isLocked 
            ? `Owner manually locked to ${newTier.toUpperCase()} (${newCadence.toUpperCase()} cadence): ${lockedReason || 'Manual override'}`
            : existing.whyExplanation,
        }
      };
    });

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.customerId === customerId) {
          return {
            ...inv,
            riskTier: newTier,
            cadence: newCadence,
            isLockedByOwner: isLocked,
            timeline: [
              {
                id: `t-${Date.now()}`,
                timestamp: 'Just now',
                type: 'owner_action',
                title: `Risk Tier Updated to ${newTier.toUpperCase()} (${newCadence.toUpperCase()})`,
                description: isLocked 
                  ? `Owner locked customer to ${newTier.toUpperCase()}. Automatic updates frozen.`
                  : `Owner moved customer to ${newTier.toUpperCase()}.`,
              },
              ...inv.timeline,
            ],
          };
        }
        return inv;
      })
    );

    setSelectedCustomerForRisk(null);
    triggerConfetti();
    addToast(
      'success',
      `Customer Risk Updated: ${newTier.toUpperCase()}`,
      `Cadence set to ${newCadence.toUpperCase()}. ${isLocked ? 'Choice locked by owner.' : 'Kept current after payments.'}`
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
    } else {
      setFocusItems((prev) => prev.filter((f) => f.id !== item.id));
      addToast('info', 'Action Completed', `${item.title} has been processed.`);
    }
  };

  const handleUpgradePrompt = (tier: PlanTier = 'growth') => {
    setPlanTier(tier);
    addToast('success', `Plan switched to ${tier.toUpperCase()}`, 'Features for this tier are now unlocked.');
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
    triggerConfetti();
    addToast(
      'success', 
      `Enrolled: ${fullInvoice.invoiceNumber}`, 
      `${fullInvoice.customerCompany} entered ${fullInvoice.bucket.toUpperCase()} bucket. Sequence starting.`
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
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id
            ? {
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
              }
            : inv
        )
      );
      addToast('info', 'Part Payment Received', `${formatINR(amountPaid)} received. Remaining balance: ${formatINR(newBalance)}. Follow-up paused for 3 days.`);
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

  // Day 22 Approvals
  const handleDay22Approve = (item: any, actionKey: string) => {
    triggerConfetti();
    addToast('success', 'Action Approved & Executed', `${item.recommendationTitle} for ${item.customerCompany}.`);
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
        onOpenCustomerPortal={() => {
          setSelectedInvoiceForPortal(invoices[0]);
          setIsCustomerPortalOpen(true);
        }}
        onOpenPlanSettings={() => setIsPlanSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Minimal Uncluttered Top Navbar */}
        <TopNavbar
          activeTab={activeTab}
          planTier={planTier}
          setPlanTier={setPlanTier}
          selectedEntity={selectedEntity}
          setSelectedEntity={setSelectedEntity}
          entities={mockBusinessEntities}
          pendingActionsCount={focusItems.length}
          onOpenCustomerPortal={() => {
            setSelectedInvoiceForPortal(invoices[0]);
            setIsCustomerPortalOpen(true);
          }}
          onOpenPlanSettings={() => setIsPlanSettingsOpen(true)}
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
                onViewLedger={() => {}}
                onViewChannels={() => setActiveTab('forecast')}
                onScrollToFocus={() => setActiveTab('focus')}
              />

              {/* Customer Table */}
              <LedgerTableBlock
                invoices={invoices}
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
                onAddInvoice={handleAddInvoice}
                onUpgradePrompt={handleUpgradePrompt}
              />
            </div>
          )}

          {/* VIEW 3: 21-DAY RECOVERY ENGINE (BRD Feature #5) */}
          {activeTab === 'sequence' && (
            <div>
              <SequenceEngineBlock
                planTier={planTier}
                onUpgradePrompt={handleUpgradePrompt}
              />
            </div>
          )}

          {/* VIEW 4: OMNICHANNEL AI AGENT & CONVERSATIONS (BRD Features #6 & #7) */}
          {activeTab === 'simulator' && (
            <div>
              <OmnichannelSimulatorBlock
                planTier={planTier}
                onUpgradePrompt={handleUpgradePrompt}
                onActionTriggered={(type, desc) => addToast('info', 'Autonomous Action', desc)}
              />
            </div>
          )}

          {/* VIEW 5: DAY 22 LEGAL ESCALATION & APPROVALS (BRD Feature #12) */}
          {activeTab === 'day22' && (
            <div>
              <Day22ApprovalsBlock
                planTier={planTier}
                onApproveAction={handleDay22Approve}
                onUpgradePrompt={handleUpgradePrompt}
              />
            </div>
          )}

          {/* VIEW 6: FORECAST, STAGES & CHANNELS */}
          {activeTab === 'forecast' && (
            <div className="space-y-6">
              <StagesAndChannelsBlock
                channels={mockChannelPerformances}
                planTier={planTier}
                onUpgradePrompt={() => handleUpgradePrompt('basic')}
                onFilterByStage={() => {
                  setSelectedBucket('all');
                  setActiveTab('overview');
                }}
              />

              <ForecastAndTeamBlock
                forecast={mockCashForecast}
                entities={mockBusinessEntities}
                selectedEntity={selectedEntity}
                onSelectEntity={setSelectedEntity}
                planTier={planTier}
                onUpgradePrompt={() => handleUpgradePrompt('growth')}
              />
            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#07080D] py-4 text-xs text-zinc-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">RECOVR</span>
              <span>• Receivables Recovery System</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px]">
              <span>Buckets: Early • 15+ • 30+ • 60+</span>
              <span>•</span>
              <span>Reliable (Light) • Watch (Standard) • High Risk (Intensive)</span>
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
          onSelectTier={(tier) => {
            setPlanTier(tier);
            addToast('success', `Plan upgraded to ${tier.toUpperCase()}`, 'New capabilities enabled.');
          }}
          onClose={() => setIsPlanSettingsOpen(false)}
        />
      )}

      {/* Notification Toast Stack */}
      <NotificationToast toasts={toasts} onDismiss={removeToast} />

    </div>
  );
}

export default App;
