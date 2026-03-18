# Ecclesia Media Manager

Ecclesia Media Manager (EMM) is a multi-tenant micro-SaaS for church media teams. This repository currently contains the Phase 1 database foundation and Clerk -> Supabase synchronization scaffolding.

## Current status

The following tasks are implemented:

- Task 1.1: Supabase base schema
- Task 1.2: Row Level Security (RLS)
- Task 1.3: Clerk -> Supabase webhook synchronization

The frontend application bootstrap for Phase 2 has not been created yet.

## Implemented structure

```text
app/
  api/webhooks/clerk/route.ts
src/
  lib/env.ts
  lib/supabase/admin.ts
  modules/clerk-sync/service.ts
  modules/clerk-sync/types.ts
supabase/
  migrations/
```

## Environment variables

Copy `.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_WEBHOOK_SECRET`

## Important architectural assumptions

- `profiles.id` stores the Clerk `user.id`.
- `organizations.owner_id` stores the Clerk user id of the org owner.
- `organizations.clerk_org_id` stores the Clerk organization id for sync operations.
- The current schema supports one `profiles` row per Clerk user, which means the same user is effectively modeled inside a single organization at a time.
- If the product must support one user in multiple churches simultaneously, Phase 1 schema should evolve to a membership table instead of binding `profiles` directly to one `org_id`.

## Next recommended step

Proceed to Phase 2 with:

- Task 2.1: Next.js + Tailwind + ShadcnUI + folder structure

Read `docs/handoff.md` before continuing.
