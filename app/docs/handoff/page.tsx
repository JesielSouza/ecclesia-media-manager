import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const handoffItems = [
  "Fase 1 finalizada com schema SQL, RLS e webhook Clerk -> Supabase.",
  "Fase 2 bootstrapada com Next.js App Router, Tailwind CSS e base de componentes no estilo shadcn.",
  "Proxy raiz com Clerk e selecao de organizacao ativos para proteger o dashboard.",
  "Task 2.3 concluida com CRUD de escalas tenant-aware e autorizacao para admins e leaders.",
  "Fase 3 concluida com confirmacao mobile-first, checklist interativo e follow-up via WhatsApp.",
  "Fase 4 concluida com billing da Abacatepay, checkout recorrente e webhook atualizando o plano da organizacao.",
  "Fase 5 avancada com gating por plano e status da assinatura, historico administrativo de billing e observabilidade de webhook.",
] as const;

export default function HandoffPage() {
  return (
    <AppShell>
      <section className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold">
            Handoff da Arquitetura
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Resumo executivo do estado atual do projeto para orientar a continuidade da
            Fase 6 com menos ambiguidade.
          </p>
        </div>

        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader>
            <CardTitle>Estado atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {handoffItems.map((item) => (
              <p
                key={item}
                className="rounded-2xl bg-background/80 p-4 text-sm text-muted-foreground"
              >
                {item}
              </p>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
