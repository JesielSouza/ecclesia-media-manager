create extension if not exists pgcrypto;

create type public.plan_type as enum ('basic', 'pro', 'premium');
create type public.profile_role as enum ('admin', 'leader', 'volunteer');
create type public.schedule_status as enum ('pending', 'confirmed', 'declined');
create type public.checklist_category as enum ('pre-culto', 'pos-culto');
create type public.checklist_log_status as enum ('done');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  plan_type public.plan_type not null default 'basic',
  owner_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint organizations_name_not_blank check (btrim(name) <> ''),
  constraint organizations_slug_not_blank check (btrim(slug) <> '')
);

create unique index if not exists organizations_slug_unique_idx
  on public.organizations (lower(slug));

create index if not exists organizations_owner_id_idx
  on public.organizations (owner_id);

create table if not exists public.profiles (
  id text primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role public.profile_role not null default 'volunteer',
  full_name text not null,
  phone_number text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_full_name_not_blank check (btrim(full_name) <> ''),
  constraint profiles_phone_number_not_blank check (
    phone_number is null or btrim(phone_number) <> ''
  ),
  constraint profiles_org_id_id_unique unique (org_id, id)
);

create index if not exists profiles_org_id_idx
  on public.profiles (org_id);

create index if not exists profiles_org_role_idx
  on public.profiles (org_id, role);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_date timestamptz not null,
  user_id text not null,
  role_name text not null,
  status public.schedule_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint schedules_role_name_not_blank check (btrim(role_name) <> ''),
  constraint schedules_org_user_unique unique (org_id, event_date, user_id, role_name),
  constraint schedules_org_id_user_id_fkey
    foreign key (org_id, user_id)
    references public.profiles(org_id, id)
    on delete cascade
);

create index if not exists schedules_org_id_event_date_idx
  on public.schedules (org_id, event_date);

create index if not exists schedules_user_id_idx
  on public.schedules (user_id);

create index if not exists schedules_org_status_idx
  on public.schedules (org_id, status);

create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  task_name text not null,
  category public.checklist_category not null,
  is_mandatory boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint checklists_task_name_not_blank check (btrim(task_name) <> ''),
  constraint checklists_org_task_category_unique unique (org_id, task_name, category),
  constraint checklists_org_id_id_unique unique (org_id, id)
);

create index if not exists checklists_org_category_idx
  on public.checklists (org_id, category);

create table if not exists public.checklist_logs (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null,
  user_id text not null,
  org_id uuid not null references public.organizations(id) on delete cascade,
  status public.checklist_log_status not null default 'done',
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint checklist_logs_org_id_checklist_id_fkey
    foreign key (org_id, checklist_id)
    references public.checklists(org_id, id)
    on delete cascade,
  constraint checklist_logs_org_id_user_id_fkey
    foreign key (org_id, user_id)
    references public.profiles(org_id, id)
    on delete cascade
);

create index if not exists checklist_logs_org_id_completed_at_idx
  on public.checklist_logs (org_id, completed_at desc);

create index if not exists checklist_logs_checklist_id_idx
  on public.checklist_logs (checklist_id);

create index if not exists checklist_logs_user_id_idx
  on public.checklist_logs (user_id);

create trigger set_organizations_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_schedules_updated_at
before update on public.schedules
for each row
execute function public.set_updated_at();

create trigger set_checklists_updated_at
before update on public.checklists
for each row
execute function public.set_updated_at();
