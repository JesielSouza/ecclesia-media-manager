# Entidades

## Organizações
- Tabela: `organizations`
- Papel: tenant raiz do sistema.
- Campos-chave: `id`, `clerk_org_id`, `name`, `slug`, `owner_id`, `plan_type`.
- Observação: `owner_id` guarda o `user.id` do Clerk e também participa do bootstrap de acesso.

## Perfis
- Tabela: `profiles`
- Papel: projeção operacional do usuário dentro da organização.
- Campos-chave: `id`, `org_id`, `role`, `full_name`, `phone_number`.
- Relação: `id` é o `user.id` do Clerk.
- Risco estrutural: a PK é somente `id`, então o mesmo usuário não pode existir legitimamente em duas organizações ao mesmo tempo.

## Escalas
- Tabela: `schedules`
- Papel: alocação de voluntários por data, função e status.
- Campos-chave: `org_id`, `event_date`, `user_id`, `role_name`, `status`.
- Restrição crítica: FK composta para `profiles(org_id, id)` evita referência cruzada entre tenants.

## Checklists
- Tabela: `checklists`
- Papel: templates operacionais por organização e categoria.
- Campos-chave: `org_id`, `task_name`, `category`, `is_mandatory`.

## Logs de checklist
- Tabela: `checklist_logs`
- Papel: trilha de execução com carimbo temporal.
- Campos-chave: `checklist_id`, `user_id`, `org_id`, `status`, `completed_at`.

## Billing
- Tabelas principais: `billing_checkouts`, `billing_webhook_events` e colunas de billing em `organizations`.
- Papel: checkout, rastreabilidade operacional e gating de features.

## Riscos já confirmados
- `profiles` mistura identidade global e vínculo organizacional na mesma tabela.
- Um backfill ou webhook de membership pode sobrescrever o `org_id` do mesmo usuário se o modelo não for protegido.
- Eventos de remoção de membership exigem cuidado para não apagar projeções erradas.

## Notas relacionadas
[[00 - Visão]]
[[02 - Fluxos]]
[[03 - Estado Operacional]]
[[04 - Arquitetura]]
[[05 - Decisões]]
[[99 - Infra]]

## Heurística para a IA
- Ao tocar em `profiles`, perguntar primeiro se a operação assume usuário mono-org ou multi-org.
- Validar sempre o caminho completo: schema, sync do Clerk, RLS e consultas dos módulos.
- Tratar `organizations.clerk_org_id` e `profiles.id` como chaves de integração externas, não como simples campos internos.
- Documentar qualquer tentativa de contornar o risco estrutural sem redesign explícito.
