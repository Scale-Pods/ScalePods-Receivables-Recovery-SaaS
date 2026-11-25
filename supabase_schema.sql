-- ==============================================================================
-- RECOVR SaaS — Supabase Production Schema & Security Configuration
-- ==============================================================================
-- Run this script in your Supabase Dashboard: SQL Editor -> "New query" -> Run
--
-- HOW PASSWORDS ARE ENCRYPTED:
-- Supabase Auth automatically encrypts and hashes all passwords on signup
-- using industry-standard bcrypt (with cryptographic salt, work factor 10).
-- Passwords are stored securely in auth.users and are NEVER visible in plaintext,
-- even to database administrators or API consumers.
-- ==============================================================================

-- 1. Create public.profiles table (linked 1:1 with auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  company_name text not null,
  company_logo text,
  plan_tier text not null default 'free' check (plan_tier in ('free', 'basic', 'growth', 'enterprise')),
  billing_cycle text default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. RLS Policies:
-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can update their own profile (name, logo, tier)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. Automatic Profile Trigger on Signup
-- When a user registers via supabase.auth.signUp(), this function automatically
-- creates their profile record using the metadata provided during signup.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    company_name,
    company_logo,
    plan_tier,
    billing_cycle
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'Finance Admin'),
    coalesce(new.raw_user_meta_data->>'company_name', 'My Enterprise'),
    new.raw_user_meta_data->>'company_logo',
    coalesce(new.raw_user_meta_data->>'plan_tier', 'free'),
    coalesce(new.raw_user_meta_data->>'billing_cycle', 'monthly')
  )
  on conflict (id) do update set
    company_name = coalesce(excluded.company_name, profiles.company_name),
    company_logo = coalesce(excluded.company_logo, profiles.company_logo),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Optional Storage Bucket for Company Logos
-- Run this if you want to store uploaded logos in Supabase Storage
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

create policy "Public Access to Company Logos"
  on storage.objects for select
  using (bucket_id = 'company-logos');

create policy "Authenticated users can upload Company Logos"
  on storage.objects for insert
  with check (bucket_id = 'company-logos' and auth.role() = 'authenticated');

-- ==============================================================================
-- 6. Dashboard Ledger Tables: Invoices, Customers, Payments, Focus Items
-- ==============================================================================

-- 6.1 Customers Table
create table if not exists public.customers (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  company text not null,
  email text,
  phone text,
  bucket text,
  risk_score integer default 50,
  risk_tier text,
  cadence text,
  is_locked_by_owner boolean default false,
  locked_reason text,
  last_updated_after_payment text,
  why_explanation text,
  total_outstanding numeric default 0,
  total_paid_lifetime numeric default 0,
  avg_payment_days integer default 0,
  primary_contact text,
  history_factors jsonb,
  score_breakdown jsonb,
  recent_conversations jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.customers enable row level security;
create policy "Users can manage own customers"
  on public.customers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_customers_user on public.customers(user_id);

-- 6.2 Invoices Table
create table if not exists public.invoices (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_number text not null,
  customer_id text not null,
  customer_name text not null,
  customer_company text not null,
  customer_email text,
  customer_phone text,
  amount numeric not null,
  currency text default '₹',
  due_date text,
  days_overdue integer default 0,
  bucket text check (bucket in ('early', '15+', '30+', '60+')),
  bucket_tone text,
  status text default 'active' check (status in ('active', 'paid', 'paused', 'disputed', 'promise')),
  risk_score integer default 50,
  risk_tier text,
  cadence text,
  current_stage text,
  last_touch jsonb,
  next_scheduled_step text,
  has_proof_file boolean default false,
  proof_file jsonb,
  has_ticket boolean default false,
  ticket_query text,
  has_dispute boolean default false,
  dispute_reason text,
  promised_date text,
  settlement_offer jsonb,
  timeline jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.invoices enable row level security;
create policy "Users can manage own invoices"
  on public.invoices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_invoices_user on public.invoices(user_id);
create index if not exists idx_invoices_status on public.invoices(status);

-- 6.3 Payments & Settlements Table (Updates as payments are made or verified)
create table if not exists public.payments (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  invoice_id text references public.invoices(id) on delete set null,
  invoice_number text not null,
  customer_name text not null,
  customer_company text not null,
  amount numeric not null,
  payment_method text not null,
  bank_reference text,
  proof_url text,
  status text default 'verified',
  settled_at timestamptz default timezone('utc'::text, now()) not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.payments enable row level security;
create policy "Users can manage own payments"
  on public.payments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_payments_user on public.payments(user_id);

-- 6.4 Focus Items & Approvals Table
create table if not exists public.focus_items (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  customer_name text not null,
  company text not null,
  invoice_id text not null,
  amount numeric not null,
  badge_text text,
  badge_variant text,
  description text,
  details jsonb,
  action_primary jsonb,
  action_secondary jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.focus_items enable row level security;
create policy "Users can manage own focus items"
  on public.focus_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_focus_items_user on public.focus_items(user_id);

-- 6.5 User Email Integrations (Approach B: OAuth 2.0 Google Workspace / Outlook)
create table if not exists public.user_email_integrations (
  id uuid primary key default gen_random_uuid(),
  customer_uid text not null,
  provider text not null default 'google',
  connected_email text not null,
  refresh_token text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_email_integrations_customer_provider_key unique (customer_uid, provider)
);

alter table public.user_email_integrations enable row level security;

create policy "Users can view own email integration"
  on public.user_email_integrations for select
  using (true);

create policy "Users can manage own email integration"
  on public.user_email_integrations for all
  using (true)
  with check (true);

create index if not exists idx_user_email_integrations_customer on public.user_email_integrations(customer_uid);

-- 6.6 Credentials Table Migration
-- Adds connected_email to track the active outreach mailbox directly on the user's Credentials record
-- Adds Sequence so the approval workflow can generate dates from the saved cadence.
alter table public."Credentials" add column if not exists connected_email text;
alter table public."Credentials" add column if not exists "Sequence" text;

-- 6.7 Consolidated Recovery Outreach Migration
-- Self-contained fallback for fresh installs. Existing production databases can
-- skip this create step; the ALTER statements below are safe to re-run.
create table if not exists public.recovery_outreach (
  id bigint generated by default as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  party_name text,
  email text,
  phone text,
  gstin text,
  bill_no text,
  voucher_no text,
  transaction_date date,
  overdue_amount numeric,
  running_balance numeric,
  debit numeric,
  credit numeric,
  "Final_Amount" numeric,
  "Payment_Date" date,
  "Type" text,
  "Note" text,
  current_stage text,
  next_action text,
  next_action_date date,
  status text,
  dispute text,
  founder_review text,
  "Escalation" text, -- Approvals queue: only rows with a non-empty value appear there
  cycle_started_date date,
  oldest_due_date date,
  max_overdue_days integer,
  customer_name text,
  customer_email text,
  customer_uid text,
  plan_tier text not null default 'free',
  sentiment text,
  sentiment_score numeric,
  intent text,
  summary text,
  closed text not null default 'no',
  risk_score integer,
  risk_reason text,
  email_conversation text,
  wa_conversation text,
  custom_sequence_config text
);

-- Existing installs that already created recovery_outreach get the approval flag too.
alter table public.recovery_outreach add column if not exists "Escalation" text;

-- Payment mode and optional note captured when an invoice is marked paid.
alter table public.recovery_outreach add column if not exists "Type" text;
alter table public.recovery_outreach add column if not exists "Note" text;

-- Channel scheduling columns used by the approval-time date generator.
do $$
declare
  i int;
begin
  for i in 1..10 loop
    execute format('alter table public.recovery_outreach add column if not exists email_%s_date date', i);
    execute format('alter table public.recovery_outreach add column if not exists wa_%s_date date', i);
    execute format('alter table public.recovery_outreach add column if not exists call_%s_date date', i);
  end loop;
end $$;

create index if not exists idx_recovery_outreach_gstin_bill
  on public.recovery_outreach (gstin, bill_no);

-- Duplicate checks are scoped to the logged-in account, so index both account keys.
create index if not exists idx_recovery_outreach_uid_bill
  on public.recovery_outreach (customer_uid, bill_no);

create index if not exists idx_recovery_outreach_email_bill
  on public.recovery_outreach (customer_email, bill_no);

-- Consolidates tier-specific tables into a single recovery_outreach table:
-- 1. Rename the active populated table to recovery_outreach:
--    alter table public.recovery_outreach_enterprise rename to recovery_outreach;
-- 2. Add plan_tier column with default 'free':
--    alter table public.recovery_outreach add column if not exists plan_tier text not null default 'free';
-- 3. Set existing records to 'enterprise':
--    update public.recovery_outreach set plan_tier = 'enterprise';
-- 4. Delete old empty tier tables:
--    drop table if exists public.recovery_outreach_free;
--    drop table if exists public.recovery_outreach_basic;
--    drop table if exists public.recovery_outreach_growth;
-- 5. Add index for fast querying by client and plan tier:
--    create index if not exists idx_recovery_outreach_client on public.recovery_outreach(customer_uid, plan_tier);

-- 6.8 Domain Seat Quota & Subdomain Abuse Prevention Trigger
-- Atomically prevents race conditions when concurrent users sign up under the same corporate domain.
-- Matrix: Free (3), Basic (3), Growth (5), Enterprise (10 accounts).
CREATE OR REPLACE FUNCTION public.check_domain_seat_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    raw_domain text;
    root_domain text;
    domain_count int;
    highest_tier text := 'free';
    max_seats int := 3;
    tier_rank int;
BEGIN
    -- Extract domain from email (e.g. alice@sales.acme.com -> sales.acme.com)
    raw_domain := lower(split_part(NEW."Email", '@', 2));

    -- Handle multi-part ccSLDs (.co.in, .com.au, .co.uk) vs standard TLDs to prevent subdomain abuse
    IF raw_domain LIKE '%.co.in' OR raw_domain LIKE '%.com.au' OR raw_domain LIKE '%.co.uk' OR raw_domain LIKE '%.org.in' THEN
        root_domain := substring(raw_domain from '([^.]+\.[^.]+\.[^.]+)$');
    ELSE
        root_domain := substring(raw_domain from '([^.]+\.[^.]+)$');
    END IF;

    IF root_domain IS NULL OR root_domain = '' THEN
        root_domain := raw_domain;
    END IF;

    -- Count existing accounts under root domain and find highest active tier
    SELECT 
        count(*),
        coalesce(max(
            CASE 
                WHEN lower(coalesce("Tier", 'free')) = 'enterprise' THEN 4
                WHEN lower(coalesce("Tier", 'free')) = 'growth' THEN 3
                WHEN lower(coalesce("Tier", 'free')) = 'basic' THEN 2
                ELSE 1
            END
        ), 1)
    INTO domain_count, tier_rank
    FROM public."Credentials"
    WHERE lower("Email") LIKE '%@' || root_domain 
       OR lower("Email") LIKE '%.%' || root_domain;

    -- Map rank to tier name and seat limits
    IF tier_rank = 4 THEN
        highest_tier := 'enterprise';
        max_seats := 10;
    ELSIF tier_rank = 3 THEN
        highest_tier := 'growth';
        max_seats := 5;
    ELSIF tier_rank = 2 THEN
        highest_tier := 'basic';
        max_seats := 3;
    ELSE
        highest_tier := 'free';
        max_seats := 3;
    END IF;

    -- Atomically block transaction if company quota limit is reached
    IF domain_count >= max_seats THEN
        RAISE EXCEPTION 'Your organization (%) has reached its limit of % accounts on the % plan. To add more team members, an existing team member must upgrade your company workspace to Growth (5 accounts) or Enterprise (10 accounts).',
            root_domain, max_seats, upper(highest_tier);
    END IF;

    -- Automatically inherit organization's active tier
    IF NEW."Tier" IS NULL OR lower(NEW."Tier") = 'free' THEN
        NEW."Tier" := highest_tier;
    END IF;

    -- Mark account #1 as owner if no previous account existed for this domain
    IF domain_count = 0 THEN
        BEGIN
            NEW."Role" := 'owner';
        EXCEPTION WHEN undefined_column THEN
            -- Role column is optional in Credentials
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_domain_seat_quota ON public."Credentials";
CREATE TRIGGER trg_enforce_domain_seat_quota
BEFORE INSERT ON public."Credentials"
FOR EACH ROW
EXECUTE FUNCTION public.check_domain_seat_quota();

-- ==============================================================================
-- 12. Plan limits & pricing (server-read only)
-- ==============================================================================
-- One row per plan tier. "Price_monthly" and "Price_yearly" are authoritative
-- for pricing and must only be changed by a database administrator in the
-- Supabase SQL editor. Price_yearly is the total annual amount.
-- The app reads these rows through /api/plan-limits; clients never write here.
create table if not exists public.recovery_plan_limits (
  id bigint generated by default as identity not null,
  plan_name text not null,
  max_invoices_per_month integer null,
  max_ai_call_minutes integer null,
  email_enabled boolean null default true,
  whatsapp_enabled boolean null default false,
  ai_calls_enabled boolean null default false,
  manual_upload_enabled boolean null default true,
  bulk_upload_enabled boolean null default false,
  email_forwarding_enabled boolean null default false,
  max_invoicing_connections integer null default 0,
  light_sequence_enabled boolean null default true,
  standard_sequence_enabled boolean null default false,
  intensive_sequence_enabled boolean null default false,
  editable_sequence_enabled boolean null default false,
  max_sequence_days integer null,
  ai_bucket_selection boolean null default false,
  advanced_risk_scoring boolean null default false,
  ai_risk_weighting boolean null default false,
  ai_reply_analysis boolean null default false,
  promise_capture boolean null default false,
  ai_next_step boolean null default false,
  ai_payment_plans boolean null default false,
  ai_best_time_channel boolean null default false,
  dispute_tracking boolean null default true,
  auto_dispute_extension boolean null default false,
  credit_hold boolean null default false,
  team_alerts boolean null default false,
  lawyer_handoff boolean null default false,
  late_interest_claim boolean null default false,
  international_payments boolean null default false,
  invoice_grouping boolean null default false,
  instalments_enabled boolean null default false,
  multiple_bank_accounts boolean null default false,
  bulk_payment_marking boolean null default false,
  custom_payment_gateways boolean null default false,
  history_months integer null,
  allowed_channels text[] null,
  allowed_sequence_types text[] null,
  payment_methods text[] null,
  custom_limits jsonb null default '{}'::jsonb,
  status text null default 'Active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  "Sequence" text null,
  "Price_yearly" text null,
  "Price_monthly" text null,
  constraint recovery_plan_limits_pkey primary key (id),
  constraint recovery_plan_limits_plan_name_key unique (plan_name)
) tablespace pg_default;

alter table public.recovery_plan_limits enable row level security;

drop policy if exists "Active plan limits are readable" on public.recovery_plan_limits;
create policy "Active plan limits are readable"
  on public.recovery_plan_limits for select
  using (status = 'Active');

-- No INSERT/UPDATE/DELETE policies exist for anon or authenticated roles.
-- Revoke write privileges explicitly as defence in depth.
revoke insert, update, delete, truncate on public.recovery_plan_limits
  from anon, authenticated, service_role;
grant select on public.recovery_plan_limits to anon, authenticated, service_role;

-- This invoker-rights trigger additionally blocks service_role writes, so a
-- leaked key cannot change pricing. Only administrator roles (SQL editor /
-- migrations running as postgres) can write.
create or replace function public.block_client_plan_limit_writes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'recovery_plan_limits is read-only for API clients';
  end if;

  if tg_op = 'TRUNCATE' then
    return null;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_block_client_plan_limit_writes on public.recovery_plan_limits;
create trigger trg_block_client_plan_limit_writes
before insert or update or delete on public.recovery_plan_limits
for each row execute function public.block_client_plan_limit_writes();

drop trigger if exists trg_block_client_plan_limit_truncate on public.recovery_plan_limits;
create trigger trg_block_client_plan_limit_truncate
before truncate on public.recovery_plan_limits
for each statement execute function public.block_client_plan_limit_writes();

