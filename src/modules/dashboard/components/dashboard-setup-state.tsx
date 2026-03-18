import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardSetupStateProps = {
  errorMessage: string;
  title?: string;
};

const migrationFiles = [
  "20260317120000_task_1_1_base_schema.sql",
  "20260317123000_task_1_2_rls.sql",
  "20260317130000_task_1_3_clerk_sync_support.sql",
  "20260318100000_task_4_abacatepay_billing.sql",
  "20260318113000_task_5_6_billing_observability.sql",
  "20260318150000_task_6_1_request_scoped_tenant_context.sql",
  "20260318163000_task_6_2_role_aware_rls.sql",
] as const;

export function DashboardSetupState({
  errorMessage,
  title = "Dashboard aguardando setup do Supabase",
}: DashboardSetupStateProps) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          O app conseguiu autenticar o usuario, mas a estrutura esperada no Supabase
          ainda nao esta disponivel para carregar os dados do tenant.
        </p>
      </div>

      <Card className="border-rose-200 bg-rose-50/90 shadow-soft">
        <CardHeader>
          <CardTitle>Erro atual</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-rose-800">{errorMessage}</CardContent>
      </Card>

      <Card className="border-white/70 bg-white/90 shadow-soft">
        <CardHeader>
          <CardTitle>Como corrigir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Aplique as migrations no projeto Supabase configurado em <code>NEXT_PUBLIC_SUPABASE_URL</code>.</p>
          <div className="space-y-2">
            {migrationFiles.map((file) => (
              <p
                key={file}
                className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 font-mono text-xs"
              >
                supabase/migrations/{file}
              </p>
            ))}
          </div>
          <p>
            Depois confirme que o webhook do Clerk esta populando a tabela
            <code> organizations</code> para a organizacao ativa.
          </p>
          <p>
            Para a fase 6.2, confirme tambem que o Clerk consegue emitir o JWT
            template usado pelo Supabase e que as migrations mais recentes de RLS
            foram aplicadas no ambiente.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
