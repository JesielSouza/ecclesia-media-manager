# Estado Operacional

## Status atual
Base funcional para autenticação, dashboard operacional, escalas, checklists e billing já existe. O projeto está em fase de endurecimento arquitetural, principalmente em identidade multi-tenant, request-scoped Supabase e confiabilidade operacional de sync/backfill.

## Tarefa concluída nesta rodada
- Revalidação e reescrita do `/brain` com base no código real.
- Correção do script `scripts/backfill-clerk-sync.mjs` para contabilizar organizações sincronizadas.
- Adição de proteção explícita contra conflito multi-org em `src/modules/clerk-sync/service.ts` e `scripts/backfill-clerk-sync.mjs`.
- Registro do problema de encoding/mojibake nas notas antigas do `/brain`.
- Restauração de dependências com `npm install` para reativar o `typescript` ausente no workspace.

## Riscos ativos
- Risco estrutural alto: `profiles` usa `id = Clerk user id` e também carrega `org_id`, impedindo modelagem nativa multi-org.
- Risco operacional médio: o acesso request-scoped ainda mantém fallback por headers (`x-user-id` / `x-clerk-user-id`) quando o token JWT do Clerk não está disponível.
- Risco de produto médio: assets ainda parecem área futura, mas já participam do gating de planos.

## Bugs confirmados
- Encoding: as notas antigas do `/brain` estavam com mojibake (`MÃ³dulo`, `HeurÃ­stica`, etc.), indicando gravação/leitura incompatível de charset em documentação local.
- Backfill: o contador `organizationsSynced` não era incrementado.
- Backfill/sync: o modelo anterior permitia sobrescrever silenciosamente `profiles.org_id` quando o mesmo usuário surgisse em outra organização.

## Pendências recomendadas
1. Evoluir de `profiles` mono-org para `profiles` global + `organization_memberships` tenant-aware.
2. Remover fallback legado por headers após confirmar JWT template do Clerk em todos os ambientes.
3. Rodar validação end-to-end real de webhook Clerk, backfill e acesso request-scoped no ambiente integrado.

## Última validação
- Comando alvo desta rodada: `npm run typecheck`.
- Resultado: passou após restaurar dependências com `npm install`.

## Notas relacionadas
[[00 - Visão]]
[[01 - Entidades]]
[[02 - Fluxos]]
[[04 - Arquitetura]]
[[05 - Decisões]]
[[99 - Infra]]

## Heurística para a IA
- Atualizar esta nota ao fim de cada tarefa concluída, mesmo quando a tarefa for só documental.
- Registrar sempre: o que mudou, risco descoberto, validação executada e próximo passo.
- Se uma correção não resolver a causa raiz, explicitar a contenção temporária e o redesign necessário.
- Não marcar build como válido sem rodar o comando real no workspace.
