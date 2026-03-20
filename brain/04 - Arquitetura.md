# Arquitetura

## Visão geral
Aplicação Next.js App Router com Clerk como camada de identidade, Supabase/PostgreSQL como projeção operacional e políticas RLS para isolamento tenant-aware. A arquitetura mistura proteção de rota no app, contexto organizacional resolvido no servidor e enforcement no banco.

## Camadas principais
- Interface: `app/` com páginas e layouts do dashboard.
- Módulos de domínio: `src/modules/*` para schedules, checklists, billing, auth e clerk-sync.
- Integração: webhooks em `app/api/webhooks/*`.
- Persistência: migrations em `supabase/migrations/*`.
- Scripts operacionais: `scripts/*`.
- Cérebro operacional: `brain/*`.

## Resolução de tenant
- Clerk fornece `userId`, `orgId` e `orgRole`.
- O servidor tenta obter um token do template JWT do Clerk para o Supabase.
- Se não houver token, o client request-scoped ainda envia headers legados de compatibilidade.
- O Supabase aplica RLS com base em claims e headers.

## Modelo de dados operacional
- `organizations` representa o tenant.
- `profiles` representa o usuário dentro do tenant, mas hoje mistura identidade global e vínculo organizacional.
- `schedules` e `checklist_logs` usam FKs compostas para manter integridade por organização.

## Integrações externas
- Clerk: autenticação, memberships, webhooks e seleção de organização.
- Supabase: banco, RLS e acesso request-scoped.
- Abacatepay: checkout recorrente, reconciliação e webhook de assinatura.
- WhatsApp: link profundo via `wa.me`, sem provedor oficial integrado.

## Decisões arquiteturais visíveis no código
- Preferência por Server Components e ações no servidor para dados sensíveis.
- Uso de RLS como barreira de defesa, não apenas filtros no frontend.
- Webhooks projetam dados do Clerk para o schema operacional em vez de consultar Clerk a cada tela.
- Billing usa observabilidade explícita de webhook para suporte e diagnóstico.

## Fragilidades atuais
- O modelo mono-org em `profiles` é o principal débito estrutural.
- A compatibilidade com headers reduz a segurança conceitual até a migração completa para JWT template.
- Parte da segurança depende da consistência entre contexto do Clerk, projeção no Supabase e policies SQL.

## Notas relacionadas
[[00 - Visão]]
[[01 - Entidades]]
[[02 - Fluxos]]
[[03 - Estado Operacional]]
[[05 - Decisões]]
[[99 - Infra]]

## Heurística para a IA
- Sempre mapear a mudança em quatro pontos: UI, módulo server, integração externa e migration/RLS.
- Se houver dado multi-tenant, verificar se o enforcement está no banco e não apenas no app.
- Tratar scripts operacionais como parte da arquitetura, porque podem corromper projeções.
- Qualquer workaround temporário deve mencionar a camada afetada e a condição para remoção.
