alter table public.organizations
add column if not exists clerk_org_id text;

create unique index if not exists organizations_clerk_org_id_unique_idx
  on public.organizations (clerk_org_id)
  where clerk_org_id is not null;
