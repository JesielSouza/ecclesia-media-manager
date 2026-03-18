# Deploy And Homologation Checklist

## Supabase

- Apply all pending SQL migrations before promoting a new build.
- Ensure `20260318150000_task_6_1_request_scoped_tenant_context.sql` is present in the target environment.
- Ensure `20260318163000_task_6_2_role_aware_rls.sql` is present in the target environment.
- Confirm RLS is enabled and forced for:
  - `organizations`
  - `profiles`
  - `schedules`
  - `checklists`
  - `checklist_logs`
  - `billing_checkouts`
  - `billing_webhook_events`
- Validate that `organizations.clerk_org_id` is populated for every active tenant.
- Validate that Clerk membership sync has created `profiles` rows for active users.

## Environment

- Confirm `NEXT_PUBLIC_APP_URL` points to the final deployed URL.
- Confirm Clerk frontend and secret keys are set for the same Clerk instance.
- Confirm Clerk can issue the JWT template used by Supabase request-scoped access. Default template name: `supabase`.
- Confirm Supabase URL, anon key, and service role key all belong to the same project.
- Confirm Abacatepay product ids and webhook secret are set for the production account.

## External Integrations

- Clerk webhook must target `/api/webhooks/clerk`.
- Abacatepay webhook must target `/api/webhooks/abacatepay?webhookSecret=...`.
- Re-send one Clerk organization event in homologation to verify tenant sync.
- Validate one authenticated dashboard request after sign-in to confirm the Clerk JWT template is accepted by Supabase.
- Re-send one Abacatepay event in homologation to verify billing observability and plan updates.

## End-To-End Smoke Test

- Sign in with a user that has an active Clerk organization.
- Confirm dashboard access redirects correctly when there is no active organization.
- Confirm the active tenant resolves correctly in `/dashboard/schedules`.
- Create, edit, and delete one schedule as `admin` or `leader`.
- Confirm a volunteer can only see and respond to their own serving assignments.
- Create, edit, and complete one checklist item.
- Start one billing checkout and confirm the record appears in `/dashboard/billing`.
- Verify `/dashboard/assets` respects both `plan_type` and `billing_subscription_status`.
- Confirm a user from another organization cannot access or mutate tenant data by URL tampering.

## Operational Notes

- `npm run db:link -- --project-ref <project-ref> --password <db-password>` is required before `npm run db:push` against a remote project.
- Webhook handlers still use `service_role`, but dashboard reads and mutations now prefer a Clerk JWT template plus tenant context headers and only keep header identity as a temporary compatibility bridge.
- If deployment succeeds but the dashboard loses data access, validate that the new Phase 6 migration was applied before investigating app code.
