# Decisões

## D-001: Clerk como fonte de verdade de identidade
- Status: vigente.
- Motivo: autenticação, organizações e memberships já vivem no Clerk.
- Consequência: Supabase guarda uma projeção operacional, não a identidade canônica.

## D-002: Supabase com schema relacional e RLS
- Status: vigente.
- Motivo: isolamento por tenant e integridade referencial são requisitos centrais.
- Consequência: mudanças em identidade impactam migrations, helpers SQL e clients request-scoped.

## D-003: `profiles` como projeção operacional por usuário
- Status: vigente, mas sob risco.
- Motivo original: simplificar a fase inicial.
- Problema: `profiles.id` é global, enquanto `org_id` é tenant-scoped.
- Decisão operacional desta rodada: adicionar falha explícita no sync/backfill quando houver conflito multi-org, em vez de sobrescrita silenciosa.
- Próxima decisão necessária: migrar para `profiles` global + `organization_memberships`.

## D-004: Request-scoped Supabase com JWT do Clerk, mantendo fallback temporário
- Status: vigente com dívida técnica.
- Motivo: compatibilidade entre ambientes enquanto o template JWT não está garantido em todos eles.
- Consequência: existe superfície adicional por headers legados que deve ser removida após validação completa.

## D-005: Billing orientado por plano e status de assinatura
- Status: vigente.
- Motivo: evitar liberar features pagas apenas porque `plan_type` foi salvo.
- Consequência: gating depende de `plan_type` e `billing_subscription_status`.

## D-006: Obsidian `/brain` como memória operacional do projeto
- Status: vigente a partir desta rodada.
- Motivo: reduzir perda de contexto arquitetural durante execução contínua.
- Consequência: toda tarefa concluída deve refletir na [[03 - Estado Operacional]].

## Notas relacionadas
[[00 - Visão]]
[[01 - Entidades]]
[[02 - Fluxos]]
[[03 - Estado Operacional]]
[[04 - Arquitetura]]
[[99 - Infra]]

## Heurística para a IA
- Registrar decisões como trade-off, não como slogan tecnológico.
- Se uma decisão for provisória, explicitar o gatilho de revisão.
- Toda decisão que tocar identidade, tenant ou billing deve citar impacto operacional.
- Evitar “decisões implícitas”: se o código endureceu comportamento, documentar.
