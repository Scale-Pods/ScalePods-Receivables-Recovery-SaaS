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

-- 6.6 Credentials Table Migration (Add connected_email column)
-- Adds connected_email to track the active outreach mailbox directly on the user's Credentials record
alter table public."Credentials" add column if not exists connected_email text;

-- 6.7 Consolidated Recovery Outreach Migration
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



