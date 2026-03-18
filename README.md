# Ecclesia Media Manager

Ecclesia Media Manager (EMM) is a multi-tenant micro-SaaS for church media teams. The repository now includes the Phase 1 database foundation, the Phase 2 admin dashboard bootstrap, and the first operational flows from Phase 3.

## Current status

Implemented tasks:

- Task 1.1: Supabase base schema
- Task 1.2: Row Level Security (RLS)
- Task 1.3: Clerk -> Supabase webhook synchronization
- Task 2.1: Next.js App Router + Tailwind CSS + shadcn-style UI base + folder structure
- Task 2.2: route protection middleware with Clerk + active organization selection
- Task 2.3: admin schedule CRUD with tenant-aware organization resolution
- Task 3.1: volunteer mobile-first confirmation flow
- Task 3.2: interactive checklist flow with timestamp logs
- Task 3.3: simple WhatsApp follow-up integration from schedules
- Task 4.1: Abacatepay recurring subscription checkout bootstrap
- Task 4.2: Abacatepay payment webhook updating tenant plan state
- Task 4.3: plan-based feature gating foundation for dashboard areas
- Task 5.1: broader dashboard gating coverage using centralized feature access rules
- Task 5.2: plan-change aware billing UX for new subscription, upgrade, and downgrade intents
- Task 5.4: feature gating now respects subscription status, not only saved `plan_type`
- Task 5.5: administrative billing history with manual checkout resynchronization
- Task 5.6: billing webhook observability with processing results and operational notes
- Task 6.1: request-scoped Supabase access foundation using Clerk tenant headers + RLS
- Task 6.2: role-aware RLS hardening plus Clerk JWT template support for request-scoped Supabase access

## Application structure

```text
app/
  api/webhooks/abacatepay/route.ts
  api/webhooks/clerk/route.ts
  globals.css
  layout.tsx
  page.tsx
src/
  components/
    layout/
    ui/
  lib/
    env.ts
    supabase/
    utils.ts
  modules/
    billing/
    checklists/
    clerk-sync/
    dashboard/
    notifications/
    schedules/
supabase/
  migrations/
```

## Current product flows

The current repository already spans Phases 1 through 4. The main product flows available today are:

- `/dashboard/schedules` is protected by Clerk and requires an active organization
- admins and leaders can manage schedule records and open WhatsApp follow-ups for pending or declined volunteers
- `/dashboard/serving` gives volunteers a mobile-first view to confirm or decline their own upcoming assignments
- `/dashboard/checklists` lets the team execute pre-service and post-service checklists with timestamped completion logs
- checklist templates remain tenant-scoped and editable only by organization `admin` and `leader` roles
- `/dashboard/billing` starts recurring subscription checkout, distinguishes new subscription vs upgrade vs downgrade intent, prevents duplicate pending checkouts, and exposes administrative history plus manual reconciliation
- `/dashboard/assets` is gated by both `plan_type` and `billing_subscription_status`, only unlocking for organizations with the required paid plan and an active subscription
- premium feature access is centralized in helpers so the dashboard can render locked/unlocked states consistently
- webhook events now expose operational processing state (`processed`, `ignored`, `error`) for support visibility
- request-scoped Supabase access now accepts a Clerk JWT template token when available and falls back to legacy headers only as a compatibility bridge

Main files:

- `app/dashboard/schedules/page.tsx`
- `app/dashboard/serving/page.tsx`
- `app/dashboard/checklists/page.tsx`
- `app/dashboard/billing/page.tsx`
- `app/api/webhooks/abacatepay/route.ts`
- `src/modules/billing/abacatepay.ts`
- `src/modules/billing/feature-access.ts`
- `src/modules/billing/server/repository.ts`
- `src/modules/billing/server/actions.ts`
- `proxy.ts`
- `supabase/migrations/20260318113000_task_5_6_billing_observability.sql`
- `src/modules/checklists/server/repository.ts`
- `src/modules/checklists/server/actions.ts`
- `src/modules/notifications/whatsapp.ts`
- `src/modules/schedules/server/repository.ts`
- `src/modules/schedules/server/actions.ts`

## Environment variables

Copy `.env.example` and set:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_SUPABASE_JWT_TEMPLATE` (optional, defaults to `supabase`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `ABACATEPAY_API_KEY`
- `ABACATEPAY_PUBLIC_KEY`
- `ABACATEPAY_WEBHOOK_SECRET`
- `ABACATEPAY_PRO_PRODUCT_ID`
- `ABACATEPAY_PREMIUM_PRODUCT_ID`

Operational note:

- Clerk sign-in/sign-up now fail gracefully if Clerk is not configured, showing setup guidance instead of a runtime crash
- for local sync, expose `http://localhost:3000/api/webhooks/clerk` through a tunnel and register that URL in the Clerk Webhooks dashboard
- configure the Abacatepay webhook URL as `http://localhost:3000/api/webhooks/abacatepay?webhookSecret=...`
- the billing area is restricted to tenant `admin` and `leader` roles
- the latest subscription checkout can be manually synchronized against `GET /v2/subscriptions/list` if the webhook is delayed
- feature access helpers now centralize plan-to-feature rules for future gating across dashboard pages
- the dashboard route interception now uses Next.js root `proxy.ts` instead of the deprecated `middleware.ts` convention
- webhook observability now stores processing result, note, checkout correlation and subscription id for recent billing events
- request-scoped Supabase access now prefers a Clerk JWT template token; configure the Clerk template used by Supabase before production rollout

## Running locally

1. Install dependencies with `npm install`
2. Start the app with `npm run dev`
3. Open `http://localhost:3000`

## Database operations

- Link the local CLI to a Supabase project with `npm run db:link -- --project-ref <project-ref> --password <db-password>`
- Apply pending migrations with `npm run db:push`
- Run `npm run readiness` to verify env coverage plus Supabase bootstrap state
- Run `npm run clerk:backfill` to seed Supabase from Clerk when webhook delivery is not ready yet
- The latest Phase 6 migrations are `20260318150000_task_6_1_request_scoped_tenant_context.sql` and `20260318163000_task_6_2_role_aware_rls.sql`
- Review the deploy and homologation checklist in [`docs/deploy-homologation-checklist.md`](/c:/Users/Jesiel/Desktop/Workspace/ecclesia-media-manager/docs/deploy-homologation-checklist.md)
- Review the first tenant bootstrap flow in [`docs/first-tenant-bootstrap.md`](/c:/Users/Jesiel/Desktop/Workspace/ecclesia-media-manager/docs/first-tenant-bootstrap.md)

## Requirements inventory

The repository includes [`requirements.txt`](/c:/Users/Jesiel/Desktop/Workspace/ecclesia-media-manager/requirements.txt) as a documented inventory of runtime requirements, external services, environment variables, and NPM packages currently used by the project.

Important:

- this is not a Python dependency file
- package installation remains `npm install`

## Important architectural assumptions

- `profiles.id` stores the Clerk `user.id`.
- `organizations.owner_id` stores the Clerk user id of the org owner.
- `organizations.clerk_org_id` stores the Clerk organization id for sync operations.
- The current schema supports one `profiles` row per Clerk user, which means the same user is effectively modeled inside a single organization at a time.
- If the product must support one user in multiple churches simultaneously, Phase 1 schema should evolve to a membership table instead of binding `profiles` directly to one `org_id`.

## Validation

- `npm run lint`
- `npm run typecheck`
