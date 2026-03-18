# First Tenant Bootstrap

## Goal

Populate the first real tenant in Supabase so the dashboard can leave setup mode and the end-to-end homologation can start.

## 1. Local environment

- Set `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local` for local homologation.
- Confirm Clerk and Supabase keys point to the same working project.
- Set `CLERK_SUPABASE_JWT_TEMPLATE=supabase` unless a different Clerk JWT template name is intentionally used.
- Fill the Abacatepay variables if billing checkout must be validated in this round.

## 2. Start the app

- Run `npm run dev`.
- Open `http://localhost:3000`.

## 3. Expose the local webhook URL

- Use a tunnel such as `ngrok`, `cloudflared`, or similar.
- Point Clerk webhook delivery to `<public-url>/api/webhooks/clerk`.
- Confirm Clerk also has a JWT template for Supabase request-scoped access before relying on Phase 6.2 in homologation.

## 4. Trigger Clerk sync

- In Clerk, create or select an organization.
- Add at least one membership to that organization.
- Ensure the acting user has an org role that maps to `admin` or `leader` when needed.
- Re-send the latest organization and organizationMembership webhook events if the rows do not appear automatically.
- If webhook delivery is not ready yet, run `npm run clerk:backfill` as a temporary bootstrap path.

## 5. Validate Supabase bootstrap

- Run `npm run readiness`.
- Confirm `organizations` count is greater than zero.
- Confirm `profiles` count is greater than zero.
- Confirm the readiness output acknowledges the Clerk JWT template setting for secure request-scoped access.

## 6. Validate protected app flows

- Sign in with the synced user.
- Select the organization in Clerk if prompted.
- Open `/dashboard/schedules` and create one schedule.
- Open `/dashboard/checklists` and create one template plus one execution log.
- Open `/dashboard/serving` with a volunteer account and confirm only its own schedule is visible.

## 7. Validate billing, if configured

- Configure Abacatepay webhook delivery to `<public-url>/api/webhooks/abacatepay?webhookSecret=...`.
- Start one checkout from `/dashboard/billing`.
- Re-run `npm run readiness` and confirm billing rows begin to appear.

## Common blockers

- Empty dashboard setup state usually means Clerk webhook delivery is not configured or did not run successfully.
- Billing buttons disabled usually means `NEXT_PUBLIC_APP_URL` or Abacatepay env vars are missing.
- Cross-tenant failures after Phase 6 usually point to missing Clerk sync data, missing Phase 6 migrations, or a Clerk JWT template that is not configured for Supabase.
