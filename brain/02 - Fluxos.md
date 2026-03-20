# Fluxos

## Autenticação e seleção de organização
1. Usuário autentica via Clerk.
2. `proxy.ts` protege `/dashboard`.
3. Se não houver organização ativa, o usuário é redirecionado para `/select-organization`.
4. O servidor resolve o contexto ativo com `userId`, `orgId`, `orgRole` e token opcional para Supabase.

## Sync Clerk -> Supabase
1. Clerk envia webhook validado por Svix em `/api/webhooks/clerk`.
2. O serviço sincroniza `organizations`, memberships e dados básicos de usuário.
3. Memberships projetam dados em `profiles`.
4. Se um usuário aparecer em outra organização, o serviço agora falha explicitamente para evitar sobrescrita silenciosa do `org_id`.

## Backfill de identidade
1. Script `npm run clerk:backfill` lê organizações, memberships e usuários do Clerk.
2. O script cria ou atualiza `organizations`.
3. O script projeta memberships em `profiles`.
4. O script agora interrompe a execução quando encontra conflito multi-org em `profiles`.

## Gestão de escalas
1. O dashboard resolve a organização ativa no Supabase.
2. Admins e leaders listam membros e escalas por `org_id`.
3. Criação e edição validam status, data e pertencimento do voluntário à organização ativa.
4. Follow-up pode gerar link de WhatsApp a partir de `phone_number`.

## Confirmação do voluntário
1. Voluntário acessa `/dashboard/serving`.
2. O sistema lista apenas escalas do usuário ativo na organização ativa.
3. O usuário confirma ou recusa somente eventos futuros.

## Checklists operacionais
1. Templates ficam em `checklists`.
2. Execuções geram entradas imutáveis em `checklist_logs`.
3. Gestão de templates é restrita a `admin` e `leader`.

## Billing e gating
1. Gestores iniciam checkout recorrente no dashboard.
2. Abacatepay envia webhooks para atualizar estado operacional.
3. O acesso a features pagas depende do plano mínimo e do status da assinatura.

## Notas relacionadas
[[00 - Visão]]
[[01 - Entidades]]
[[03 - Estado Operacional]]
[[04 - Arquitetura]]
[[05 - Decisões]]
[[99 - Infra]]

## Heurística para a IA
- Em todo fluxo, verificar primeiro onde o tenant é resolvido e onde ele é imposto.
- Sempre distinguir “fonte de verdade” de “projeção operacional”.
- Se um fluxo cruzar Clerk, Supabase e webhook, documentar o ponto de falha e a forma de observabilidade.
- Ao alterar um fluxo, atualizar a nota [[03 - Estado Operacional]] com risco, progresso e validação.
