export interface TimelineStep {
  day: string;
  stageName: string;
  tagline: string;
  channel: 'WhatsApp' | 'Email' | 'IVR Call' | 'Portal' | 'Legal';
  intensity: 'Gentle' | 'Standard' | 'Firm' | 'Pre-Litigation';
  badgeColor: string;
  description: string;
  previewMessage: string;
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatarInitials: string;
  avatarBg: string;
  quote: string;
  statHighlight: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceINR: number;
  annualPriceINR: number;
  highlighted?: boolean;
  badge?: string;
  features: string[];
  ctaLabel: string;
  isCustomPrice?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const navigationLinks = [
  { label: 'Architecture', href: '#engine' },
  { label: 'Benchmark', href: '#comparison' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export const keyProofMetrics = [
  { value: '₹480 Cr+', label: 'Receivables Recovered', detail: 'Across 34,000+ invoices' },
  { value: '6.2 Days', label: 'Average DSO Drop', detail: 'From 58 days industry mean' },
  { value: '4.2x', label: 'Faster Payment Clearance', detail: 'Instant UPI, NEFT & RTGS' },
  { value: '98.4%', label: 'Customer Retention', detail: 'Zero vendor relationship friction' },
];

export const engine21Steps: TimelineStep[] = [
  {
    day: 'Day 1 - 3',
    stageName: 'The Courteous Whisper',
    tagline: 'Gentle automated reconciliation check',
    channel: 'Email',
    intensity: 'Gentle',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    description: 'Friendly notification verifying whether the invoice has reached the finance desk or if a revised purchase order number is required.',
    previewMessage: '“Namaste Rajesh ji. Kindly confirm receipt of GST Tax Invoice #INV-2024-8842 for ₹1,84,000. Let us know if PO reconciliation is pending.”'
  },
  {
    day: 'Day 5 - 8',
    stageName: 'Omnichannel Smart Sync',
    tagline: 'Interactive WhatsApp with 1-click Razorpay UPI',
    channel: 'WhatsApp',
    intensity: 'Standard',
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    description: 'Multi-touch WhatsApp message embedded with verified virtual payment accounts, instant remittance slip upload, and dispute raise triggers.',
    previewMessage: '“Accounts Reminder: Payment for ₹1,84,000 is 5 days overdue. Tap below to settle instantly via UPI/NEFT or reply PAID with UTR reference.”'
  },
  {
    day: 'Day 12 - 15',
    stageName: 'Interactive Ticket & Auto-Pause',
    tagline: 'AI handles billing disputes with zero friction',
    channel: 'Portal',
    intensity: 'Standard',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    description: 'If the debtor reports a PO discrepancy or missing delivery proof, reminders auto-pause for 72 hours while internal accounts verify.',
    previewMessage: '“Dispute Logged: Reminders paused until Nov 12. Corrected invoice PDF with amended GSTIN re-issued to finance team.”'
  },
  {
    day: 'Day 18 - 20',
    stageName: 'Dynamic Settlement Incentive',
    tagline: 'Authorized quick-clearance cash discount',
    channel: 'WhatsApp',
    intensity: 'Firm',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    description: 'Pre-authorized 4.5% settlement discount if remitted via RTGS/IMPS within 4 hours, protecting cash flow before month-end close.',
    previewMessage: '“Special Authorization: Settle today for ₹1,75,720 (4.5% prompt clearance waiver). Offer expires at 5:00 PM IST.”'
  },
  {
    day: 'Day 22+',
    stageName: 'Executive Escalation & Notice',
    tagline: 'Pre-litigation legal notice with owner sign-off',
    channel: 'Legal',
    intensity: 'Pre-Litigation',
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    description: 'Automated Advocate Notice of Claim under Section 138 / MSME Samadhaan generated with one-click owner approval and tracking.',
    previewMessage: '“FORMAL NOTICE OF DEMAND: Nexora Infotech Pvt Ltd. Non-compliance after 21 days escalated to Credit Bureau & Legal Panel.”'
  }
];

export const channelFeatures = [
  {
    id: 'whatsapp',
    title: 'Interactive WhatsApp Business API',
    subtitle: '94% open rate within 5 minutes',
    description: 'Deliver rich interactive cards with instant Razorpay UPI links, NEFT Virtual Accounts, and quick-reply action buttons.',
    iconName: 'MessageSquare',
    accentColor: 'from-emerald-500/20 to-teal-500/5',
    borderColor: 'border-emerald-500/30',
    bulletPoints: [
      'Pre-approved WhatsApp Cloud API templates compliant with Meta policies',
      'Auto-detects "PAID", "UTR" or remittance slips and pauses reminders',
      'Instant GST receipt delivered directly to client phone upon settlement'
    ]
  },
  {
    id: 'ivr',
    title: 'Human-Sounding Voice AI Agent',
    subtitle: 'Professional, multilingual Indian phone follow-up',
    description: 'Conversational voice agent polite enough for Tier-1 clients, capable of speaking Hindi, English, and regional accents.',
    iconName: 'PhoneCall',
    accentColor: 'from-purple-500/20 to-indigo-500/5',
    borderColor: 'border-purple-500/30',
    bulletPoints: [
      'Never gets aggressive, tired, or emotionally frustrated',
      'Logs customer commitment dates directly into your ledger',
      'Seamless warm-transfer to your human credit controller if required'
    ]
  },
  {
    id: 'portal',
    title: 'Customer Self-Serve Portal',
    subtitle: 'Frictionless settlement in under 60 seconds',
    description: 'Secure, tokenized payment page for each debtor showing historical statements, dispute filing, and payment proof uploads.',
    iconName: 'Globe',
    accentColor: 'from-blue-500/20 to-cyan-500/5',
    borderColor: 'border-blue-500/30',
    bulletPoints: [
      'No password or login required - instant secure magic-link access',
      'Split payment options & installment plan requests',
      'Bank-grade SSL 256-bit encryption with RBI-compliant payment gateways'
    ]
  },
  {
    id: 'risk',
    title: 'Autonomous Debtor Risk Scoring',
    subtitle: 'Predictive intelligence tailored per client',
    description: 'Machine learning scores every debtor from 1 to 100 based on past payment velocity, GST compliance, and dispute frequency.',
    iconName: 'ShieldAlert',
    accentColor: 'from-amber-500/20 to-orange-500/5',
    borderColor: 'border-amber-500/30',
    bulletPoints: [
      'Reliable (Light) • Watch (Standard) • High Risk (Intensive)',
      'Prevents bad debt by catching warning signs 14 days before due date',
      'Owner override lock gives you absolute executive control'
    ]
  }
];

export const comparisonData = [
  {
    criteria: 'Cost / Commission',
    recovr: 'Flat SaaS Fee (Keep 100% of recovered cash)',
    traditionalAgency: '20% - 35% commission on collected amount',
    manualExcel: 'High hidden cost (3 FTEs chasing spreadsheets)'
  },
  {
    criteria: 'Customer Relationship',
    recovr: '98.4% preserved with courteous, respectful AI',
    traditionalAgency: 'High risk of aggressive calls damaging vendor goodwill',
    manualExcel: 'Awkward founder / sales team collection emails'
  },
  {
    criteria: 'Average Days to Recovery',
    recovr: '6.2 Days after cycle start',
    traditionalAgency: '45 - 90 Days with bureaucratic delays',
    manualExcel: '65+ Days (invoices easily slip through cracks)'
  },
  {
    criteria: 'Payment Methods',
    recovr: 'Instant UPI, Virtual Accounts, NEFT, RTGS & Cards',
    traditionalAgency: 'Physical Cheques & manual bank transfers',
    manualExcel: 'Offline checks and prolonged email back-and-forths'
  },
  {
    criteria: 'Legal Notice Escalation',
    recovr: 'Automated Section 138 / MSME Samadhaan on Day 22',
    traditionalAgency: 'Requires separate lawyer retainer & court filing costs',
    manualExcel: 'Rarely executed until overdue exceeds 180 days'
  }
];

export const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For solopreneurs and micro-businesses recovering early overdue invoices.',
    monthlyPriceINR: 0,
    annualPriceINR: 0,
    features: [
      'Up to 10 Invoices in recovery / month',
      'Manual form & smart single-file upload',
      'Email reminder channel',
      'Light workflow (starts Day 1)',
      'Basic invoice overdue risk scoring',
      '1-click dispute pause & owner review',
      '6-month history & 3 key metrics'
    ],
    ctaLabel: 'Start Free Forever'
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'For growing small businesses and agencies with steady B2B receivables.',
    monthlyPriceINR: 4999,
    annualPriceINR: 3999,
    features: [
      'Up to 50 Invoices in recovery / month',
      'Bulk invoice upload support',
      'Email & WhatsApp smart messages',
      'Light & Standard workflows with tone choice',
      'Pre-reminder "due soon" notifications',
      'Late-payment history scoring',
      'Final legal notice template (Day 22)',
      '1-year history & all 8 KPI numbers'
    ],
    ctaLabel: 'Start 14-Day Free Trial'
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For scaling mid-market enterprises requiring omnichannel recovery & AI calls.',
    monthlyPriceINR: 14999,
    annualPriceINR: 11999,
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Up to 300 Invoices in recovery / month',
      'Email forwarding & 1 ERP/Accounting connector',
      'Email + WhatsApp + Autonomous AI Voice Calls',
      '90 AI call minutes included / month',
      'Light, Standard & Intensive 21-day workflows',
      'AI reply reading & promise-to-pay capture',
      'Full Day 22 tracking, auto extensions & credit holds',
      'Today’s focus queue & cash forecast',
      '3-year history & executive summary'
    ],
    ctaLabel: 'Claim Growth Pilot'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large corporations & multi-entity distributors with custom scale & compliance.',
    monthlyPriceINR: 0,
    annualPriceINR: 0,
    isCustomPrice: true,
    badge: 'Custom Scale',
    features: [
      'Unlimited invoices entering recovery',
      'Unlimited ERP connections & ledger import',
      'Dedicated WhatsApp number & custom AI voice',
      'Custom AI call minutes volume by contract',
      'Fully customizable workflow builder & AI bucket picker',
      'Self-improving AI timing & tone adaptation',
      'Section 138 / MSME claim filing & lawyer hand-off',
      'Multi-entity consoles & scheduled PDF reports',
      'Dedicated account manager & SLA guarantee'
    ],
    ctaLabel: 'Talk to Enterprise Sales'
  }
];

export const testimonials: Testimonial[] = [
  {
    name: 'Sandeep Singhal',
    role: 'Chief Financial Officer',
    company: 'Zenith Logistics Infra Pvt Ltd',
    avatarInitials: 'SS',
    avatarBg: 'bg-[#C85A2A]',
    quote: 'Before implementing this platform, our average DSO was 64 days and our finance team spent half their week writing polite reminder emails. Within our first 45 days, we unlocked ₹3.8 Crores in overdue cash with zero customer pushback.',
    statHighlight: 'DSO slashed by 28 days'
  },
  {
    name: 'Ananya Deshmukh',
    role: 'Head of Finance & Credit Control',
    company: 'Nexora Software Labs',
    avatarInitials: 'AD',
    avatarBg: 'bg-[#2E5B88]',
    quote: 'The 21-Day Engine and interactive WhatsApp links are game-changers. Clients pay directly via UPI in seconds. The Day 22 pre-litigation notice draft solved two 90-day delinquent accounts in 48 hours.',
    statHighlight: '₹1.9 Cr recovered in month 1'
  },
  {
    name: 'Vikram Malhotra',
    role: 'Managing Director',
    company: 'Vortex Media Interactive LLP',
    avatarInitials: 'VM',
    avatarBg: 'bg-[#311E28]',
    quote: 'Traditional debt collectors damage your brand. This autonomous AI agent handles disputes gracefully, automatically pauses when a client raises a valid PO question, and gets the invoice cleared without damaging executive relationships.',
    statHighlight: '100% client retention preserved'
  }
];

export const faqs: FaqItem[] = [
  {
    question: 'How does the platform integrate with existing ERP & accounting ledgers?',
    answer: 'The platform connects directly via modern REST APIs and webhooks with SAP, Zoho Books, QuickBooks, and custom accounting ledgers. Invoices are ingested the moment they are generated, and reconciled instantly upon payment.'
  },
  {
    question: 'Will automated outreach damage our client relationships?',
    answer: 'No. Workflows begin with polite, courteous reconciliation prompts and adapt tone based on past payment behavior. If a client raises a PO query or dispute, automated outreach pauses immediately.'
  },
  {
    question: 'Which payment methods do debtors use to settle?',
    answer: 'Every notification includes verified 1-click links supporting UPI (Google Pay, PhonePe), HDFC/ICICI Virtual Accounts, NEFT/RTGS, and Corporate Cards with automatic GST receipts.'
  },
  {
    question: 'What is the Day 22 Escalation feature?',
    answer: 'If an invoice remains overdue past 21 days across all touchpoints, the platform drafts a formal Advocate Notice of Demand compliant with Section 138 / MSME Samadhaan. Nothing is ever dispatched without your explicit one-click approval.'
  },
  {
    question: 'Is financial and customer data secure and compliant?',
    answer: 'Yes. Hosted in MeitY-empaneled data centers with ISO 27001 and SOC 2 Type II compliance. All data is protected by end-to-end 256-bit AES encryption, and debtor information is never shared.'
  }
];
