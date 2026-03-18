create or replace function public.current_profile_role(target_org_id uuid)
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select profiles.role
  from public.profiles profiles
  where profiles.org_id = target_org_id
    and profiles.id = public.current_user_id()
  limit 1
$$;

create or replace function public.can_manage_org(target_org_id uuid)
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
        or public.current_profile_role(target_org_id) in ('admin', 'leader')
      )
  )
$$;

create or replace function public.can_access_schedule(
  target_org_id uuid,
  assigned_user_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_manage_org(target_org_id)
    or (
      public.can_access_org(target_org_id)
      and assigned_user_id = public.current_user_id()
    )
$$;

drop policy if exists organizations_update_policy on public.organizations;
drop policy if exists organizations_delete_policy on public.organizations;
drop policy if exists profiles_insert_policy on public.profiles;
drop policy if exists profiles_update_policy on public.profiles;
drop policy if exists profiles_delete_policy on public.profiles;
drop policy if exists schedules_select_policy on public.schedules;
drop policy if exists schedules_insert_policy on public.schedules;
drop policy if exists schedules_update_policy on public.schedules;
drop policy if exists schedules_delete_policy on public.schedules;
drop policy if exists checklists_insert_policy on public.checklists;
drop policy if exists checklists_update_policy on public.checklists;
drop policy if exists checklists_delete_policy on public.checklists;
drop policy if exists checklist_logs_insert_policy on public.checklist_logs;
drop policy if exists checklist_logs_update_policy on public.checklist_logs;
drop policy if exists checklist_logs_delete_policy on public.checklist_logs;
drop policy if exists billing_checkouts_select_policy on public.billing_checkouts;
drop policy if exists billing_checkouts_insert_policy on public.billing_checkouts;
drop policy if exists billing_checkouts_update_policy on public.billing_checkouts;
drop policy if exists billing_checkouts_delete_policy on public.billing_checkouts;
drop policy if exists billing_webhook_events_select_policy on public.billing_webhook_events;

create policy organizations_update_policy
on public.organizations
for update
using (public.can_manage_org(id))
with check (public.can_manage_org(id));

create policy organizations_delete_policy
on public.organizations
for delete
using (public.can_manage_org(id));

create policy profiles_insert_policy
on public.profiles
for insert
with check (public.can_manage_org(org_id));

create policy profiles_update_policy
on public.profiles
for update
using (public.can_manage_org(org_id))
with check (public.can_manage_org(org_id));

create policy profiles_delete_policy
on public.profiles
for delete
using (public.can_manage_org(org_id));

create policy schedules_select_policy
on public.schedules
for select
using (public.can_access_schedule(org_id, user_id));

create policy schedules_insert_policy
on public.schedules
for insert
with check (public.can_manage_org(org_id));

create policy schedules_update_policy
on public.schedules
for update
using (public.can_access_schedule(org_id, user_id))
with check (
  public.can_manage_org(org_id)
  or (
    public.can_access_org(org_id)
    and user_id = public.current_user_id()
  )
);

create policy schedules_delete_policy
on public.schedules
for delete
using (public.can_manage_org(org_id));

create policy checklists_insert_policy
on public.checklists
for insert
with check (public.can_manage_org(org_id));

create policy checklists_update_policy
on public.checklists
for update
using (public.can_manage_org(org_id))
with check (public.can_manage_org(org_id));

create policy checklists_delete_policy
on public.checklists
for delete
using (public.can_manage_org(org_id));

create policy checklist_logs_insert_policy
on public.checklist_logs
for insert
with check (
  public.can_access_org(org_id)
  and user_id = public.current_user_id()
);

create policy checklist_logs_update_policy
on public.checklist_logs
for update
using (public.can_manage_org(org_id))
with check (public.can_manage_org(org_id));

create policy checklist_logs_delete_policy
on public.checklist_logs
for delete
using (public.can_manage_org(org_id));

create policy billing_checkouts_select_policy
on public.billing_checkouts
for select
using (public.can_manage_org(org_id));

create policy billing_checkouts_insert_policy
on public.billing_checkouts
for insert
with check (public.can_manage_org(org_id));

create policy billing_checkouts_update_policy
on public.billing_checkouts
for update
using (public.can_manage_org(org_id))
with check (public.can_manage_org(org_id));

create policy billing_checkouts_delete_policy
on public.billing_checkouts
for delete
using (public.can_manage_org(org_id));

create policy billing_webhook_events_select_policy
on public.billing_webhook_events
for select
using (public.can_manage_org(org_id));
