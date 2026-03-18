create type public.billing_webhook_processing_result as enum (
  'received',
  'processed',
  'ignored',
  'error'
);

alter table public.billing_webhook_events
add column if not exists processing_result public.billing_webhook_processing_result not null default 'received',
add column if not exists processing_note text,
add column if not exists checkout_id uuid references public.billing_checkouts(id) on delete set null,
add column if not exists checkout_external_id text,
add column if not exists subscription_id text;

create index if not exists billing_webhook_events_org_result_processed_at_idx
  on public.billing_webhook_events (org_id, processing_result, processed_at desc);
