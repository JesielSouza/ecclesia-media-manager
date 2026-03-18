create or replace function public.organization_id_from_clerk_org_id(clerk_org_id text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organizations.id
  from public.organizations organizations
  where organizations.clerk_org_id = nullif(btrim(clerk_org_id), '')
  limit 1
$$;

create or replace function public.current_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.uid()::text, ''),
    public.request_jwt_claim_text('sub'),
    public.request_jwt_claim_text('user_id'),
    public.request_jwt_claim_text('userId'),
    public.request_header_text('x-user-id'),
    public.request_header_text('x-clerk-user-id')
  )
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    public.safe_uuid(public.request_jwt_claim_text('org_id')),
    public.safe_uuid(public.request_jwt_claim_text('organization_id')),
    public.safe_uuid(public.request_header_text('x-org-id')),
    public.organization_id_from_clerk_org_id(public.request_jwt_claim_text('orgId')),
    public.organization_id_from_clerk_org_id(public.request_jwt_claim_text('clerk_org_id')),
    public.organization_id_from_clerk_org_id(public.request_jwt_claim_text('clerkOrgId')),
    public.organization_id_from_clerk_org_id(public.request_header_text('x-clerk-org-id'))
  )
$$;

alter table public.billing_checkouts enable row level security;
alter table public.billing_webhook_events enable row level security;

alter table public.billing_checkouts force row level security;
alter table public.billing_webhook_events force row level security;

create policy billing_checkouts_select_policy
on public.billing_checkouts
for select
using (public.can_access_org(org_id));

create policy billing_checkouts_insert_policy
on public.billing_checkouts
for insert
with check (public.can_access_org(org_id));

create policy billing_checkouts_update_policy
on public.billing_checkouts
for update
using (public.can_access_org(org_id))
with check (public.can_access_org(org_id));

create policy billing_checkouts_delete_policy
on public.billing_checkouts
for delete
using (public.can_access_org(org_id));

create policy billing_webhook_events_select_policy
on public.billing_webhook_events
for select
using (public.can_access_org(org_id));
