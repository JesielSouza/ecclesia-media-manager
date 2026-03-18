# Handoff Notes

## Project summary

EMM is a multi-tenant platform for church media operations. The core principles already established in this repository are:

- strict tenant isolation by `org_id`
- database-first design with Supabase/PostgreSQL
- Clerk as identity source of truth
- production-oriented constraints instead of placeholder schema

## Delivered in Phase 1

### Task 1.1: Base schema

File:

- `supabase/migrations/20260317120000_task_1_1_base_schema.sql`

What was implemented:

- enum types for plans, roles, schedule statuses, checklist categories and checklist log statuses
- `organizations`, `profiles`, `schedules`, `checklists`, `checklist_logs`
- `created_at` and `updated_at` audit fields where appropriate
- `set_updated_at()` trigger function
- indexes optimized for tenant-scoped queries
- composite foreign keys to prevent cross-organization references

Important design detail:

- `schedules` and `checklist_logs` do not only reference parent records by id. They also enforce that referenced rows belong to the same `org_id`.

### Task 1.2: Row Level Security

File:

- `supabase/migrations/20260317123000_task_1_2_rls.sql`

What was implemented:

- helper functions to read request JWT claims and request headers
- `current_user_id()` and `current_org_id()` helpers
- `can_access_org(uuid)` as the central tenant access check
- RLS enabled and forced on all tenant tables
- CRUD policies for `organizations`, `profiles`, `schedules`, `checklists`, `checklist_logs`

Context resolution strategy:

- user identity can come from `auth.uid()`, JWT `sub`, or JWT `user_id`
- organization identity can come from JWT claims or request headers like `x-org-id` and `x-clerk-org-id`

Important operational note:

- the application layer must consistently pass the active organization id in JWT custom claims or request headers, otherwise the RLS policies will deny access

### Task 1.3: Clerk -> Supabase sync

Files:

- `supabase/migrations/20260317130000_task_1_3_clerk_sync_support.sql`
- `app/api/webhooks/clerk/route.ts`
- `src/lib/env.ts`
- `src/lib/supabase/admin.ts`
- `src/modules/clerk-sync/types.ts`
- `src/modules/clerk-sync/service.ts`
- `.env.example`

What was implemented:

- webhook endpoint using Svix verification
- Supabase admin client with service role key
- event handling for:
  - `organization.created`
  - `organization.updated`
  - `organization.deleted`
  - `organizationMembership.created`
  - `organizationMembership.updated`
  - `organizationMembership.deleted`
  - `user.created`
  - `user.updated`
  - `user.deleted`
- support column `organizations.clerk_org_id`

Important design detail:

- Clerk remains the source of truth for identity and organization lifecycle
- Supabase stores the operational projection needed by the application

## Known limitations and assumptions

### Single-org profile model

The current schema uses:

- `profiles.id = Clerk user id`
- `profiles.org_id = one organization`

That means one Clerk user is effectively represented inside one organization at a time. This is acceptable only if the product scope assumes that a user participates in a single church workspace.

If multi-org membership is required later, the data model should be refactored roughly to:

- `profiles` as global user profile
- `organization_memberships` as tenant-scoped membership and role table

That change would affect:

- schema
- RLS policies
- Clerk sync service
- future schedule/checklist foreign keys

### Organization bootstrap

The RLS strategy allows access if the request user is:

- the `organizations.owner_id`, or
- a matching row in `profiles`

This was done to avoid deadlock during tenant bootstrap, where the organization exists before all membership rows are fully synchronized.

### App bootstrap not created yet

The repository does not yet include:

- `package.json`
- Next.js app setup
- Tailwind setup
- Clerk frontend integration
- ShadcnUI setup
- Supabase local config files beyond migrations

## Recommended next actions for the next agent

1. Start Phase 2 with the application bootstrap.
2. Create the Next.js App Router foundation and install the required dependencies.
3. Define the runtime contract for active organization propagation so the RLS helpers receive `org_id` consistently.
4. Revisit the single-org profile assumption before building user-facing admin flows.

## If the user re-sends the original GSD

The next agent should continue from:

- Phase 2
- starting at Task 2.1

They should not regenerate or replace the Phase 1 work unless the user explicitly asks for a schema refactor.
