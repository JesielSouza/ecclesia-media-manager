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

### Application bootstrap status

The repository now includes:

- `package.json` with the active Next.js toolchain
- Next.js App Router setup
- Tailwind CSS setup
- Clerk frontend integration with graceful misconfiguration handling
- shared UI primitives in a shadcn-style baseline
- Supabase migrations for Phases 1 and 4 billing bootstrap

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

- `proxy.ts`
- `app/select-organization/page.tsx`
- `src/modules/auth/server/session.ts`

What was implemented:

- dashboard routes require authenticated Clerk session
- root proxy redirects users without active org to the org selection flow
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

## Delivered in Phase 4

### Task 4.1 and Task 4.2: Abacatepay checkout and webhook foundation

Files:

- `supabase/migrations/20260318100000_task_4_abacatepay_billing.sql`
- `app/dashboard/billing/page.tsx`
- `app/api/webhooks/abacatepay/route.ts`
- `src/modules/billing/types.ts`
- `src/modules/billing/abacatepay.ts`
- `src/modules/billing/server/repository.ts`
- `src/modules/billing/server/actions.ts`
- `.env.example`
- `README.md`

What was implemented:

- tenant-scoped billing persistence with organization billing columns, `billing_checkouts`, and `billing_webhook_events`
- `/dashboard/billing` route with Pro and Premium subscription checkout actions
- Abacatepay API client calling `POST /v2/subscriptions/create`
- manual reconciliation of the latest checkout using `GET /v2/subscriptions/list`
- webhook endpoint with secret-in-query validation plus HMAC verification from `X-Webhook-Signature`
- idempotent webhook processing using a SHA-256 payload hash
- organization plan updates from Abacatepay subscription events
- plan-based feature gating helpers with the first guarded area applied to `/dashboard/assets`

Important design details:

- the integration uses one recurring Abacatepay product per paid plan, referenced by env vars
- checkout correlation uses `externalId` persisted in `billing_checkouts`, then mapped back during webhook processing
- billing actions are restricted to tenant managers (`admin` and `leader`)
- if a tenant already has a pending checkout for the requested plan, the flow reuses the existing checkout URL instead of creating a duplicate
- plan access rules now live in a dedicated helper instead of being hardcoded in page components
- webhook processing intentionally avoids strict full-payload validation so future provider payload changes are less likely to break the endpoint

Operational note:

- configure the Abacatepay webhook URL as `/api/webhooks/abacatepay?webhookSecret=...`
- required env vars now include:
  - `NEXT_PUBLIC_APP_URL`
  - `ABACATEPAY_API_KEY`
  - `ABACATEPAY_PUBLIC_KEY`
  - `ABACATEPAY_WEBHOOK_SECRET`
  - `ABACATEPAY_PRO_PRODUCT_ID`
  - `ABACATEPAY_PREMIUM_PRODUCT_ID`

## Delivered in Phase 5

### Task 5.1 and Task 5.2: Expanded gating coverage and plan-change aware billing UX

Files:

- `src/modules/billing/feature-access.ts`
- `src/modules/dashboard/constants/navigation.ts`
- `app/dashboard/page.tsx`
- `app/dashboard/assets/page.tsx`
- `app/dashboard/billing/page.tsx`
- `src/modules/billing/server/repository.ts`
- `src/modules/billing/types.ts`

What was implemented:

- centralized feature matrix for current dashboard areas
- dashboard cards now reflect locked and unlocked states consistently from shared billing rules
- paid feature access now considers both `plan_type` and `billing_subscription_status`
- billing UI now distinguishes new subscription, upgrade and downgrade intent
- plan-change context is persisted into checkout metadata for later operational correlation

Important design detail:

- the product currently treats subscription lifecycle changes as new billing checkouts because a direct official cancellation/reactivation lifecycle route was not confirmed during implementation

### Task 5.5: Administrative billing history and manual reconciliation

Files:

- `app/dashboard/billing/page.tsx`
- `src/modules/billing/server/repository.ts`
- `src/modules/billing/server/actions.ts`

What was implemented:

- billing overview now returns recent checkout history instead of only the latest record
- admins and leaders can manually resynchronize a specific checkout, not just the newest one
- billing dashboard now surfaces recent checkout records with status, amount, paid timestamp and checkout URL when present

### Task 5.6: Billing webhook observability

Files:

- `supabase/migrations/20260318113000_task_5_6_billing_observability.sql`
- `app/api/webhooks/abacatepay/route.ts`
- `app/dashboard/billing/page.tsx`
- `src/modules/billing/types.ts`
- `src/modules/billing/server/repository.ts`

What was implemented:

- billing webhook events now store processing result, note, related checkout, external checkout id and subscription id
- webhook processing distinguishes `processed`, `ignored` and `error`
- billing dashboard now exposes recent webhook events with operational notes for support visibility
- webhook HTTP response now reports the processing result for easier diagnostics

Important design detail:

- duplicate webhook payloads still deduplicate by payload hash, but recent operational views now make that behavior visible instead of opaque

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

1. Start Phase 6 by introducing a request-scoped Supabase client with tenant headers or JWT custom claims.
2. Reduce service-role dependence in dashboard reads and mutations once request-scoped tenant propagation is in place.
3. Confirm whether Abacatepay exposes official subscription lifecycle endpoints for cancellation or reactivation before automating Task 5.3.
4. Revisit the single-org profile assumption before production rollout to ministries with shared volunteers.
5. Expand dashboard metrics from static placeholders into live database-backed summaries.

## If the user re-sends the original GSD

The next agent should continue from:

- Phase 6
- continuing after the Phase 5 billing hardening work, with multi-tenant request-scoped data access as the next focus

They should not regenerate or replace the Phase 1 and Phase 2 work unless the user explicitly asks for a refactor.
