# Visão

## Propósito
Ecclesia Media Manager é um micro-SaaS multi-tenant para operação de ministérios de mídia em igrejas. O foco atual do produto não é gestão de acervo de mídia, e sim execução operacional: autenticação, seleção de organização, escalas, confirmação de voluntários, checklists e billing recorrente.

## Escopo já implementado
- Autenticação e contexto organizacional com Clerk.
- Persistência operacional e isolamento tenant-aware com Supabase + RLS.
- Dashboard com rotas para escalas, minha escala, checklists, billing e área de assets bloqueada por plano.
- Webhooks de sincronização Clerk -> Supabase.
- Webhook e checkout de assinatura recorrente com Abacatepay.

## Objetivo de curto prazo
- Manter a base operacional estável.
- Reduzir dependência de fallbacks legados de headers no acesso request-scoped ao Supabase.
- Endurecer a modelagem de identidade para evitar corrupção silenciosa em `profiles`.

## Restrições de negócio e técnicas
- Toda leitura e escrita deve respeitar `org_id`.
- Clerk é a fonte de verdade para identidade e memberships.
- O schema atual de `profiles` assume, na prática, um usuário por organização.
- Recursos pagos dependem tanto de `plan_type` quanto de `billing_subscription_status`.

## Notas relacionadas
[[01 - Entidades]]
[[02 - Fluxos]]
[[03 - Estado Operacional]]
[[04 - Arquitetura]]
[[05 - Decisões]]
[[99 - Infra]]

## Heurística para a IA
- Tratar o produto como plataforma operacional multi-tenant, não como CMS de mídia genérico.
- Antes de propor mudança estrutural, verificar impacto em RLS, sync do Clerk e FKs compostas.
- Preservar a separação entre fonte de verdade de identidade (Clerk) e projeção operacional (Supabase).
- Registrar toda divergência entre o comportamento real do código e a documentação existente.
