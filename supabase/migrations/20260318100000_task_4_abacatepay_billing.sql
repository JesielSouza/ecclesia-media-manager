create type public.billing_provider as enum ('abacatepay');
create type public.billing_checkout_status as enum ('pending', 'paid', 'expired', 'cancelled', 'refunded', 'disputed');
create type public.billing_subscription_status as enum ('pending', 'active', 'cancelled', 'past_due', 'inactive');

alter table public.organizations
add column if not exists billing_provider public.billing_provider,
add column if not exists billing_customer_id text,
add column if not exists billing_subscription_id text,
add column if not exists billing_subscription_status public.billing_subscription_status not null default 'pending',
add column if not exists billing_current_period_ends_at timestamptz,
add column if not exists billing_plan_activated_at timestamptz;

create unique index if not exists organizations_billing_customer_id_unique_idx
  on public.organizations (billing_customer_id)
  where billing_customer_id is not null;

create unique index if not exists organizations_billing_subscription_id_unique_idx
  on public.organizations (billing_subscription_id)
  where billing_subscription_id is not null;

create table if not exists public.billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider public.billing_provider not null default 'abacatepay',
  external_id text not null,
  provider_checkout_id text,
  provider_customer_id text,
  plan_type public.plan_type not null,
  checkout_status public.billing_checkout_status not null default 'pending',
  amount integer,
  checkout_url text,
  completion_url text,
  return_url text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint billing_checkouts_external_id_not_blank check (btrim(external_id) <> ''),
  constraint billing_checkouts_checkout_url_not_blank check (
    checkout_url is null or btrim(checkout_url) <> ''
  ),
  constraint billing_checkouts_completion_url_not_blank check (
    completion_url is null or btrim(completion_url) <> ''
  ),
  constraint billing_checkouts_return_url_not_blank check (
    return_url is null or btrim(return_url) <> ''
  )
);

create unique index if not exists billing_checkouts_provider_external_id_unique_idx
  on public.billing_checkouts (provider, external_id);

create unique index if not exists billing_checkouts_provider_checkout_id_unique_idx
  on public.billing_checkouts (provider, provider_checkout_id)
  where provider_checkout_id is not null;

create index if not exists billing_checkouts_org_id_created_at_idx
  on public.billing_checkouts (org_id, created_at desc);

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.billing_provider not null default 'abacatepay',
  payload_hash text not null,
  event_name text not null,
  org_id uuid references public.organizations(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint billing_webhook_events_payload_hash_not_blank check (btrim(payload_hash) <> ''),
  constraint billing_webhook_events_event_name_not_blank check (btrim(event_name) <> '')
);

create unique index if not exists billing_webhook_events_provider_payload_hash_unique_idx
  on public.billing_webhook_events (provider, payload_hash);

create index if not exists billing_webhook_events_org_id_processed_at_idx
  on public.billing_webhook_events (org_id, processed_at desc);

create trigger set_billing_checkouts_updated_at
before update on public.billing_checkouts
for each row
execute function public.set_updated_at();
