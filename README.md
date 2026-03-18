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

## Application structure

```text
app/
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
    checklists/
    clerk-sync/
    dashboard/
    notifications/
    schedules/
supabase/
  migrations/
```

## Phase 3 flows

Task 3 extends the current dashboard foundation with operational routines for ministry teams:

- `/dashboard/schedules` is protected by Clerk and requires an active organization
- admins and leaders can manage schedule records and open WhatsApp follow-ups for pending or declined volunteers
- `/dashboard/serving` gives volunteers a mobile-first view to confirm or decline their own upcoming assignments
- `/dashboard/checklists` lets the team execute pre-service and post-service checklists with timestamped completion logs
- checklist templates remain tenant-scoped and editable only by organization `admin` and `leader` roles

Main files:

- `app/dashboard/schedules/page.tsx`
- `app/dashboard/serving/page.tsx`
- `app/dashboard/checklists/page.tsx`
- `src/modules/checklists/server/repository.ts`
- `src/modules/checklists/server/actions.ts`
- `src/modules/notifications/whatsapp.ts`
- `src/modules/schedules/server/repository.ts`
- `src/modules/schedules/server/actions.ts`

## Environment variables

Copy `.env.example` and set:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_WEBHOOK_SECRET`

Operational note:

- Clerk sign-in/sign-up now fail gracefully if Clerk is not configured, showing setup guidance instead of a runtime crash
- for local sync, expose `http://localhost:3000/api/webhooks/clerk` through a tunnel and register that URL in the Clerk Webhooks dashboard

## Running locally

1. Install dependencies with `npm install`
2. Start the app with `npm run dev`
3. Open `http://localhost:3000`

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
