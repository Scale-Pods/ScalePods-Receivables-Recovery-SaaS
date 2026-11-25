# ScalePods — Autonomous B2B Receivables Recovery Platform

> **[ScalePods](https://www.scalepods.co/)**  
> An autonomous B2B debt recovery and dunning intelligence system designed to help CFOs, credit controllers, and finance teams recover locked cash flow without awkward collection calls or damaging client relationships.

---

## 🌟 Key Features

1. **21-Day Autonomous Recovery Engine**:
   - Progressive follow-up outreach from Day 1 to Day 21 across Email, WhatsApp Cloud API, and Autonomous Voice AI.
   - Built-in guardrails: Strict 9:00 AM – 7:00 PM local calling window, 1 touch per channel per day limit, and *"Never Chase Paid"* instant webhook suppression.
   - 3-day hold for *"I have paid"* debtor proof submissions.

2. **Active Receivables vs. Settled & Paid Archive**:
   - Clean ledger toggle isolating pending debt from historical, fully reconciled settlements.
   - Real-time balance calculations with dynamic status filtering (`All`, `Pending`, `Disputed`, `Settled`).

3. **Smart Company Avatars**:
   - Deterministic 2-letter monogram generation (e.g., *Sterling Logistics India Pvt Ltd* $\rightarrow$ `SL`, *CyberDynamics* $\rightarrow$ `CD`) with automated fallback for company logos.

4. **Day 22 Legal Escalation & Enforcement**:
   - Automated MSMED Act 2006 Section 16 statutory compound interest calculations (3x RBI Bank Rate = 19.5% p.a.).
   - Commercial credit suspension and warehouse delivery dispatch holds with stakeholder notifications.
   - Pre-litigation formal demand notices (Section 138 NI Act / Section 8 IBC).
   - Structured 3-part RTGS settlement plans with formal docket preview.

5. **Cash Forecast & Liquidity Engine**:
   - 4-week predictive inflow projections with ML confidence scoring.
   - Monthly recovery velocity and trajectory tracking with record collection benchmarks.
   - Multi-subsidiary entity consolidation and recovery specialist performance ratings.
   - 5-stage recovery funnel and channel yield comparisons.

6. **Dual-Mode Database Persistence**:
   - Connects to Supabase PostgreSQL with automated fallback to scoped `localStorage` when cloud keys are not configured.
   - Zero configuration required for instant offline or demo operation.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/) (Responsive Dark & Light theme)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL 15+ with RLS) + LocalStorage Fallback
- **Effects**: Canvas Confetti
- **Server Workflow**: Vercel-style `/api` handlers + Node middleware for local Vite dev
- **Document AI**: Anthropic Messages API (PDF/image/CSV/TXT invoice extraction)
- **UI primitives**: shadcn-compatible structure at root-level `components/ui`

---

## 🧩 shadcn-style UI Components

TypeScript and Tailwind were already configured, so no new runtime dependencies were required. The shadcn structure was added explicitly:

- `components.json` points generated components to `@/components/ui`, utilities to `@/lib/utils`, and styles to `src/index.css`.
- `@/*` resolves to `src/*`, while `@/components/*` resolves to the requested root-level `components/*` directory.
- `tailwind.config.js` scans `./components/**/*` so classes inside copied/generated UI files are not purged.

The Vite + `src` convention would normally place components under `src/components/ui`. This project intentionally uses `/components/ui` so the requested path and the `@/components/ui/...` import convention stay consistent. Creating this folder matters because shadcn CLI writes generated primitives there and every generated component imports from that alias; without the folder and aliases, imports break and Tailwind classes in those files are omitted from the production CSS.

If setting this up from scratch:

```bash
# TypeScript (already installed here)
npm install -D typescript @types/react @types/react-dom

# Tailwind CSS (already installed here)
npm install -D tailwindcss postcss autoprefixer

# shadcn CLI (already configured here via components.json)
npx shadcn@latest init
npx shadcn@latest add button
```

The `PeakChart` component lives at `components/ui/peak-chart.tsx`; its source demo is at `components/ui/demo.tsx`. It uses only React, canvas and inline SVG, so no image assets, icon packages or providers are needed. `lucide-react` remains available for other UI.

---

## 🧾 Invoice Extraction & Approval Flow

The n8n invoice path is now implemented in-code:

1. `POST /api/invoice-extract` receives the uploaded binary (base64) plus customer/contact context and extracts invoice fields with Anthropic. This endpoint **never writes to Supabase**.
2. The dashboard shows an editable preview with the extracted data, a short-lived signed draft token, and a read-only channel-by-channel schedule preview. Saved sequences can include pre-due touches (negative `day` values): each selected week repeats the plan's mix — Free 3 emails, Basic 2 emails + 1 WhatsApp, Growth/Enterprise email + WhatsApp + call. The rest of the schedule starts on the day after the due date and recalculates immediately when the due date is corrected. It uses the saved `Credentials.Sequence` when available, otherwise the locally saved/default cadence.
3. `POST /api/invoice-approve` verifies the token, applies preview edits, re-derives the start date from the edited due date, fetches the customer's saved `Credentials.Sequence`, generates `start_date + (day - 1)` dates and channel counters (`email_N_date`, `wa_N_date`, `call_N_date`), checks duplicates by `gstin + bill_no` scoped to the logged-in account (`customer_uid`, falling back to `customer_email`), and only then inserts into `recovery_outreach`.
4. `POST /api/sequence-save` stores the cadence chosen in Sequence Studio — including any pre-due reachouts selected under “Pre-due date reachouts” — into `Credentials.Sequence`. Studio shows the finalized sequence as a flowchart in the right-hand column.

Required server env vars (see `.env.example`):

```env
ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-6
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DRAFT_SIGNING_SECRET=a-long-random-value
```

Run the workflow unit checks with:

```bash
npm test
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm`

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd recovr-landing-page

# Install dependencies
npm install
```

### 3. Environment Configuration (Optional)
The application works immediately out-of-the-box using the local database fallback. To connect live Supabase Cloud synchronization:

```bash
# Copy sample environment configuration
cp .env.example .env
```

Open `.env` and fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

To set up the cloud database tables, run the provided SQL schema in your Supabase SQL Editor:
- [`supabase_schema.sql`](./supabase_schema.sql)

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5174](http://localhost:5174) in your browser.

### 5. Build for Production
```bash
npm run build
```
Generates production build artifacts in the `dist/` directory.

---

## 📁 Project Structure

```
recovr-landing-page/
├── .env.example               # Template environment variables
├── .gitignore                  # Git ignore rules for node_modules, .env, dist
├── components.json             # shadcn component/alias configuration
├── components/                 # shadcn-compatible UI primitives (root-level /components/ui)
│   └── ui/
│       ├── peak-chart.tsx      # Canvas + inline SVG revenue chart
│       └── demo.tsx            # Source demo for PeakChart props
├── index.html                  # Single-page application entry HTML
├── package.json                # Project dependencies and build scripts
├── postcss.config.js           # PostCSS configuration for Tailwind
├── supabase_schema.sql         # Production SQL schema for Supabase
├── tailwind.config.js          # Tailwind CSS theme and styling configuration
├── tsconfig.json               # TypeScript compiler configuration
├── vite.config.ts              # Vite bundler configuration
├── src/
│   ├── App.tsx                 # Main application router (Landing Page <-> Dashboard)
│   ├── main.tsx                # Application bootstrap
│   ├── index.css               # Global typography and base styles
│   ├── components/             # Marketing landing page components
│   │   ├── Navbar.tsx          # Top navigation with ScalePods brand
│   │   ├── HeroSection.tsx     # Hero section with kinetic settlement graphic
│   │   ├── PricingSection.tsx  # Dynamic plan tier selection
│   │   ├── Footer.tsx          # Landing footer with certified compliance badges
│   │   └── ...
│   ├── dashboard/              # Full Receivables Recovery SaaS Dashboard
│   │   ├── App.tsx             # Primary dashboard state, tabs, and layout
│   │   ├── components/         # Dashboard modular blocks
│   │   │   ├── Header.tsx                 # Top app bar with theme toggle & user profile
│   │   │   ├── Sidebar.tsx                # Left navigation bar (collapsible)
│   │   │   ├── LedgerTableBlock.tsx       # Active Receivables vs Settled Archive
│   │   │   ├── PeakStatsPanel.tsx         # Four due-date, ageing, closure and settlement charts
│   │   │   ├── SequenceEngineBlock.tsx    # 21-Day Autonomous Engine & Day Stepper
│   │   │   ├── Day22ApprovalsBlock.tsx    # Legal escalation, statutory claims & holds
│   │   │   ├── ForecastAndTeamBlock.tsx   # 4-Week cash forecast & monthly velocity
│   │   │   ├── StagesAndChannelsBlock.tsx # Pipeline funnel & channel analytics
│   │   │   ├── CompanyAvatar.tsx          # Smart 2-letter monogram avatar component
│   │   │   └── ...
│   │   ├── data/               # Default mock datasets and simulation records
│   │   ├── types/              # TypeScript interfaces for invoices, customers, & plans
│   │   └── utils/              # INR currency formatters and helper utilities
│   │       └── peakStats.ts    # Due-date series + open/closed/payment insight derivation
│   └── lib/
│       ├── dashboardDb.ts      # Dual-mode database persistence (Cloud + Local)
│       └── supabase.ts         # Supabase client instantiation
```

---

## 🔒 Security & Fair Practices Compliance

- **RBI Recovery Fair Practices**: Curfew guardrails prevent calls outside 9:00 AM – 7:00 PM local customer time.
- **Section 16 MSMED Act 2006**: Automated compound interest calculations legally tied to 3x RBI bank rate.
- **Data Privacy**: Complete tenant data isolation through Supabase Row Level Security (RLS).
- **Immutable Audit Trail**: All customer notifications, calls, and owner approvals are logged with timestamps.

---

## 📄 License

Proprietary © [ScalePods](https://www.scalepods.co/). All rights reserved.
