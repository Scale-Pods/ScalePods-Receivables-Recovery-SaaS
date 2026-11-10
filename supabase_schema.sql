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

