create or replace function public.request_jwt_claim_text(claim_key text)
returns text
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> claim_key
$$;

create or replace function public.request_header_text(header_key text)
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true), '')::jsonb ->> lower(header_key)
$$;

create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  if value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return value::uuid;
  end if;

  return null;
end;
$$;

create or replace function public.current_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.uid()::text, ''),
    public.request_jwt_claim_text('sub'),
    public.request_jwt_claim_text('user_id')
  )
$$;

create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    public.safe_uuid(public.request_jwt_claim_text('org_id')),
    public.safe_uuid(public.request_jwt_claim_text('orgId')),
    public.safe_uuid(public.request_jwt_claim_text('organization_id')),
    public.safe_uuid(public.request_header_text('x-org-id')),
    public.safe_uuid(public.request_header_text('x-clerk-org-id'))
  )
$$;

create or replace function public.can_access_org(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations organizations
    where organizations.id = target_org_id
      and organizations.id = public.current_org_id()
      and (
        organizations.owner_id = public.current_user_id()
        or exists (
          select 1
          from public.profiles profiles
          where profiles.org_id = organizations.id
            and profiles.id = public.current_user_id()
        )
      )
  )
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.schedules enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_logs enable row level security;

alter table public.organizations force row level security;
alter table public.profiles force row level security;
alter table public.schedules force row level security;
alter table public.checklists force row level security;
alter table public.checklist_logs force row level security;

create policy organizations_select_policy
on public.organizations
for select
using (public.can_access_org(id));

create policy organizations_insert_policy
on public.organizations
for insert
with check (owner_id = public.current_user_id());

create policy organizations_update_policy
on public.organizations
for update
using (public.can_access_org(id))
with check (public.can_access_org(id));

create policy organizations_delete_policy
on public.organizations
for delete
using (public.can_access_org(id));

create policy profiles_select_policy
on public.profiles
for select
using (public.can_access_org(org_id));

create policy profiles_insert_policy
on public.profiles
for insert
with check (public.can_access_org(org_id));

create policy profiles_update_policy
on public.profiles
for update
using (public.can_access_org(org_id))
with check (public.can_access_org(org_id));

create policy profiles_delete_policy
on public.profiles
for delete
using (public.can_access_org(org_id));

create policy schedules_select_policy
on public.schedules
for select
using (public.can_access_org(org_id));

create policy schedules_insert_policy
on public.schedules
for insert
with check (public.can_access_org(org_id));

create policy schedules_update_policy
on public.schedules
for update
using (public.can_access_org(org_id))
with check (public.can_access_org(org_id));

create policy schedules_delete_policy
on public.schedules
for delete
using (public.can_access_org(org_id));

create policy checklists_select_policy
on public.checklists
for select
using (public.can_access_org(org_id));

create policy checklists_insert_policy
on public.checklists
for insert
with check (public.can_access_org(org_id));

create policy checklists_update_policy
on public.checklists
for update
using (public.can_access_org(org_id))
with check (public.can_access_org(org_id));

create policy checklists_delete_policy
on public.checklists
for delete
using (public.can_access_org(org_id));

create policy checklist_logs_select_policy
on public.checklist_logs
for select
using (public.can_access_org(org_id));

create policy checklist_logs_insert_policy
on public.checklist_logs
for insert
with check (public.can_access_org(org_id));

create policy checklist_logs_update_policy
on public.checklist_logs
for update
using (public.can_access_org(org_id))
with check (public.can_access_org(org_id));

create policy checklist_logs_delete_policy
on public.checklist_logs
for delete
using (public.can_access_org(org_id));
