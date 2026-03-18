import Link from "next/link";
import { ArrowRight, CheckCircle2, RadioTower, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const highlights = [
  {
    title: "Escalas centralizadas",
    description:
      "Organize equipes por culto, funcao e status de confirmacao sem perder o contexto de cada igreja.",
    icon: RadioTower,
  },
  {
    title: "Checklist operacional",
    description:
      "Padronize a preparacao do culto com trilhas auditaveis e responsabilidade clara por tarefa.",
    icon: CheckCircle2,
  },
  {
    title: "Isolamento por tenant",
    description:
      "A aplicacao nasce preparada para multi-tenancy, com fluxos pensados para `org_id` e RLS.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex rounded-full border border-white/60 bg-white/70 px-4 py-1 text-sm font-semibold text-foreground/80 shadow-sm backdrop-blur">
            Fase 2 iniciada
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Operacao dominical com menos improviso e mais confianca.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
              O Ecclesia Media Manager agora tem a fundacao do dashboard pronta em
              Next.js, Tailwind e componentes base para seguirmos para autenticacao,
              protecao de rotas e CRUD de escalas.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "lg" }), "gap-2")}
            >
              Abrir dashboard
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/docs/handoff"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Revisar arquitetura
            </Link>
          </div>
        </div>

        <Card className="border-white/70 bg-white/85 shadow-soft backdrop-blur">
          <CardHeader>
            <CardTitle className="font-[family-name:var(--font-heading)] text-2xl">
              Base pronta para as proximas tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {highlights.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/70 bg-background/70 p-4"
              >
                <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
