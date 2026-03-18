# Handoff Notes

## Project summary

EMM is a multi-tenant platform for church media operations. The core principles already established in this repository are:

- strict tenant isolation by `org_id`
- database-first design with Supabase/PostgreSQL
- Clerk as identity source of truth
- production-oriented constraints instead of placeholder schema
- active application tenant resolved from Clerk organization context

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

## Delivered in Phase 2

### Task 2.1: Dashboard foundation

Files:

- `app/layout.tsx`
- `app/page.tsx`
- `app/dashboard/layout.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/ui/*`

What was implemented:

- Next.js App Router foundation
- Tailwind CSS theme and shared UI primitives
- authenticated dashboard shell with Clerk-aware identity controls

### Task 2.2: Route protection and active organization selection

Files:

- `middleware.ts`
- `app/select-organization/page.tsx`
- `src/modules/auth/server/session.ts`

What was implemented:

- dashboard routes require authenticated Clerk session
- middleware redirects users without active org to the org selection flow
- dashboard server components can require active user plus active organization context

### Task 2.3: Schedule CRUD

Files:

- `app/dashboard/schedules/page.tsx`
- `src/modules/schedules/server/repository.ts`
- `src/modules/schedules/server/actions.ts`

What was implemented:

- tenant-aware resolution from `Clerk orgId` to synced Supabase `organizations.id`
- schedule list, metrics, create, update and delete flows in the admin dashboard
- server-side validation for event date, role, status and assigned volunteer
- mutation authorization restricted to `admin` and `leader` roles
- all schedule mutations filtered by the resolved tenant before database writes

Important design detail:

- the current app layer uses the Supabase service-role client, but every schedule operation explicitly resolves and filters by the active organization before reading or mutating data
- this keeps the current dashboard flow safe while the broader request-scoped RLS propagation contract is still evolving

## Delivered in Phase 3

### Task 3.1: Volunteer mobile-first confirmation

Files:

- `app/dashboard/serving/page.tsx`
- `src/modules/schedules/server/repository.ts`
- `src/modules/schedules/server/actions.ts`
- `src/modules/dashboard/constants/navigation.ts`

What was implemented:

- a dedicated `/dashboard/serving` route for volunteers
- confirmation and decline actions scoped to the active user and active organization
- protection against responding to past schedules
- dashboard navigation updated to expose the volunteer flow

Important design detail:

- volunteer confirmation reuses the existing schedule module instead of creating a parallel data flow
- status updates are filtered by both `org_id` and `user_id`, so one user cannot respond to another user's assignment

### Task 3.2: Interactive checklist with timestamp log

Files:

- `app/dashboard/checklists/page.tsx`
- `src/modules/checklists/server/repository.ts`
- `src/modules/checklists/server/actions.ts`

What was implemented:

- checklist template management by category (`pre-culto`, `pos-culto`)
- interactive checklist execution in the dashboard
- insertion of timestamped records into `checklist_logs`
- permissions that keep template management restricted to `admin` and `leader`, while allowing operational execution for the active tenant

Important design detail:

- the current implementation treats `checklists` as tenant-scoped templates and `checklist_logs` as execution history
- every completion creates a new log entry, preserving an operational audit trail

### Task 3.3: WhatsApp follow-up integration

Files:

- `src/modules/notifications/whatsapp.ts`
- `app/dashboard/schedules/page.tsx`

What was implemented:

- WhatsApp deep links generated from volunteer phone numbers in `profiles`
- pre-filled reminder and follow-up messages based on schedule status
- quick actions in the schedule dashboard for pending and declined assignments

Important design detail:

- this phase uses simple `wa.me` links instead of a provider API
- the flow depends on valid volunteer phone numbers being stored in international format or at least normalizable digit format

## Environment and first access notes

What was validated:

- Clerk pages now fail gracefully when Clerk is not configured, instead of crashing at runtime
- local environment requires:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CLERK_WEBHOOK_SECRET`
- Clerk webhook endpoint for this project is `/api/webhooks/clerk`

Operational note:

- first access only works end-to-end if Clerk webhook delivery is configured and organization/profile rows are synced into Supabase

## Recommended next actions for the next agent

1. Start Phase 4 with Abacatepay checkout integration.
2. Revisit the single-org profile assumption before production rollout to ministries with shared volunteers.
3. Introduce a request-scoped Supabase client with tenant headers or JWT custom claims so application reads can lean on RLS directly.
4. Expand dashboard metrics from static placeholders into live database-backed summaries.

## If the user re-sends the original GSD

The next agent should continue from:

- Phase 4
- starting at Task 4.1

They should not regenerate or replace the Phase 1 and Phase 2 work unless the user explicitly asks for a refactor.
