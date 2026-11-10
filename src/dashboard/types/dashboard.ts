export type PlanTier = 'free' | 'basic' | 'growth' | 'enterprise';

export type AgeingBucketId = 'all' | 'early' | '15+' | '30+' | '60+';

export type InvoiceStatus = 'active' | 'paid' | 'paused' | 'disputed' | 'promise';

export type ChannelType = 'email' | 'whatsapp' | 'voice';

export type CustomerRiskTier = 'reliable' | 'watch' | 'high_risk';
export type CadenceIntensity = 'light' | 'standard' | 'intensive';

export interface ScoreFactor {
  factor: string;
  impact: string;
  points: number;
  isPositive: boolean;
  explanation: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  bucket: 'early' | '15+' | '30+' | '60+';
  riskScore: number; // 0-100
  riskTier: CustomerRiskTier; // Reliable | Watch | High Risk
  cadence: CadenceIntensity; // Light | Standard | Intensive
  isLockedByOwner: boolean;
  lockedReason?: string;
  lastUpdatedAfterPayment: string;
  whyExplanation: string;
  historyFactors: {
    latePaymentsCount: number;
    avgDaysLate: number;
    promisesKept: number;
    promisesBroken: number;
    disputesCount: number;
    partPaymentHabits: 'rare' | 'frequent' | 'consistent' | 'none';
  };
  scoreBreakdown: ScoreFactor[];
  totalOutstanding: number;
  totalPaidLifetime: number;
  avgPaymentDays: number;
  primaryContact: string;
  recentConversations: {
    channel: ChannelType;
    date: string;
    snippet: string;
    sentiment: 'positive' | 'neutral' | 'urgent' | 'evasive';
  }[];
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  channel?: ChannelType;
  type: 'invoice_due' | 'email_sent' | 'email_opened' | 'whatsapp_sent' | 'whatsapp_read' | 'voice_call' | 'customer_reply' | 'promise_made' | 'proof_uploaded' | 'payment_verified' | 'owner_action' | 'dispute_opened' | 'bucket_move' | 'risk_recalculated';
  title: string;
  description: string;
  metadata?: {
    openedAt?: string;
    duration?: string;
    transcriptSnippet?: string;
    amount?: number;
    proofUrl?: string;
    proofName?: string;
    by?: string;
  };
}

export interface ProofFile {
  id: string;
  filename: string;
  fileType: 'pdf' | 'png' | 'jpeg';
  uploadDate: string;
  amountReported: number;
  bankReference: string;
  customerName: string;
  status: 'pending_review' | 'verified' | 'rejected';
  previewUrl?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  avatarUrl?: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  bucket: 'early' | '15+' | '30+' | '60+';
  bucketTone: string;
  status: InvoiceStatus;
  riskScore: number;
  riskTier: CustomerRiskTier;
  cadence: CadenceIntensity;
  isLockedByOwner?: boolean;
  currentStage: 'Friendly' | 'Firm' | 'Escalation' | 'Executive/Legal Hold' | 'Done';
  lastTouch: {
    channel: ChannelType;
    action: string;
    timestamp: string;
  };
  nextScheduledStep?: string;
  hasProofFile: boolean;
  proofFile?: ProofFile;
  hasTicket: boolean;
  ticketQuery?: string;
  hasDispute: boolean;
  disputeReason?: string;
  promisedDate?: string;
  settlementOffer?: {
    discountPct: number;
    discountedAmount: number;
    expiryDate: string;
    status: 'pending_owner' | 'accepted' | 'declined';
  };
  timeline: TimelineEvent[];
}

export interface FocusItem {
  id: string;
  type: 'approval' | 'dispute' | 'broken_promise' | 'customer_ticket' | 'payment_confirmation';
  title: string;
  customerName: string;
  company: string;
  invoiceId: string;
  amount: number;
  badgeText: string;
  badgeVariant: 'amber' | 'rose' | 'emerald' | 'purple';
  description: string;
  actionPrimary: {
    label: string;
    actionKey: string;
    isDestructive?: boolean;
  };
  actionSecondary?: {
    label: string;
    actionKey: string;
  };
  details?: Record<string, any>;
}

export interface KeyMetric {
  id: string;
  title: string;
  value: string;
  numericValue: number;
  prefix?: string;
  suffix?: string;
  changePct: number;
  changeDirection: 'up' | 'down' | 'neutral';
  isGoodDirection: boolean;
  sparkline: number[];
  tierRequired: PlanTier;
  subtext: string;
}

export interface AgeingBucketStats {
  id: 'early' | '15+' | '30+' | '60+';
  name: string;
  daysOverdueLabel: string;
  daysMin: number;
  daysMax: number;
  amount: number;
  customerCount: number;
  percentage: number;
  tone: string;
  channelFocus: string;
  urgencyColor: 'emerald' | 'amber' | 'purple' | 'rose';
  cadenceDescription: string;
}

export interface ChannelPerformance {
  channel: ChannelType;
  name: string;
  icon: string;
  touchesSent: number;
  deliveredPct: number;
  openOrReadPct: number;
  replyOrAnswerPct: number;
  recoveredAmount: number;
  avgResponseHours: number;
  activeWorkflows: number;
}

export interface CashForecastWeek {
  weekLabel: string;
  dateRange: string;
  projectedAmount: number;
  confidencePct: number;
  invoicesCount: number;
  highPayerNames: string[];
}

export interface BusinessEntity {
  id: string;
  name: string;
  region: string;
  currency: string;
  totalOutstanding: number;
  recoveredThisMonth: number;
  collectionRate: number;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerCompany: string;
  amount: number;
  paymentMethod: string;
  bankReference: string;
  proofUrl?: string;
  status: 'verified' | 'pending';
  settledAt: string;
}
