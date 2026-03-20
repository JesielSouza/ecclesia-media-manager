# Infra

## Stack operacional
- Frontend e servidor: Next.js 16 + React 19.
- Identidade: Clerk.
- Persistência e RLS: Supabase/PostgreSQL.
- Billing recorrente: Abacatepay.
- Estilo/UI: Tailwind CSS + componentes base próprios em `src/components/ui`.

## Entradas operacionais importantes
- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run readiness`
- `npm run clerk:backfill`
- `npm run db:link -- --project-ref <ref> --password <senha>`
- `npm run db:push`

## Variáveis de ambiente críticas
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_SUPABASE_JWT_TEMPLATE`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `ABACATEPAY_API_KEY`
- `ABACATEPAY_PUBLIC_KEY`
- `ABACATEPAY_WEBHOOK_SECRET`
- `ABACATEPAY_PRO_PRODUCT_ID`
- `ABACATEPAY_PREMIUM_PRODUCT_ID`

## Operação de sync
- Webhook Clerk: `app/api/webhooks/clerk/route.ts`
- Serviço de sync: `src/modules/clerk-sync/service.ts`
- Backfill manual: `scripts/backfill-clerk-sync.mjs`
- Atenção: o modelo atual não suporta memberships multi-org sem redesign.

## Operação de billing
- Webhook Abacatepay: `app/api/webhooks/abacatepay/route.ts`
- Regras de acesso: `src/modules/billing/feature-access.ts`
- Histórico e reconciliação: módulo `src/modules/billing/server/*`

## Observabilidade prática
- `docs/deploy-homologation-checklist.md`
- `docs/first-tenant-bootstrap.md`
- `docs/handoff.md`
- [[03 - Estado Operacional]]

## Notas relacionadas
[[00 - Visão]]
[[01 - Entidades]]
[[02 - Fluxos]]
[[03 - Estado Operacional]]
[[04 - Arquitetura]]
[[05 - Decisões]]

## Heurística para a IA
- Antes de rodar operação destrutiva ou remota, validar impacto em tenant, billing e sync.
- Após qualquer mudança de código, registrar o comando de validação executado.
- Se um script operacional puder corromper dados, documentar o risco junto do comando que o dispara.
- Manter este arquivo focado em execução e dependências, não em narrativa de produto.
