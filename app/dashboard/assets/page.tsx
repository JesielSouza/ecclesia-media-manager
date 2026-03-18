import type { Route } from "next";
import { LockKeyhole, PackageOpen, Sparkles } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingOverview } from "@/modules/billing/server/repository";
import {
  getFeatureAccess,
  getPlanLabel,
} from "@/modules/billing/feature-access";

export default async function AssetsPage() {
  const { organization, canManageBilling } = await getBillingOverview();
  const access = getFeatureAccess(
    organization.plan_type,
    organization.billing_subscription_status,
    "assets",
  );
  const hasAccess = access.hasAccess;
  const minimumPlan = access.minimumPlan;

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-1 text-sm font-medium text-muted-foreground shadow-sm">
          <PackageOpen className="size-4 text-primary" />
          Assets
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          Biblioteca de recursos
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Este espaco agora respeita o plano da organizacao e prepara a base para
          liberar materiais, links e templates conforme a assinatura ativa.
        </p>
      </div>

      <Card className="border-white/70 bg-white/90 shadow-soft">
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-2xl">
            {hasAccess ? (
              <Sparkles className="size-5 text-emerald-600" />
            ) : (
              <LockKeyhole className="size-5 text-amber-600" />
            )}
            {hasAccess ? "Acesso liberado" : "Acesso restrito pelo plano"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Plano atual: {getPlanLabel(organization.plan_type)}. Plano minimo para
            acessar Assets: {getPlanLabel(minimumPlan)}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasAccess ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-border/70 bg-background/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Templates
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Estrutura pronta para organizar slides, artes e arquivos de culto.
                </p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-background/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Links
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Base para centralizar referencias, drive e materiais recorrentes.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 rounded-[24px] border border-dashed border-border bg-background/70 p-5">
              <p className="text-sm text-muted-foreground">
                {access.reason === "subscription_inactive"
                  ? "O plano pago desta organizacao nao esta com assinatura ativa no momento. Regularize o billing para recuperar o acesso."
                  : `O plano atual ainda nao libera esta area. Atualize para ${getPlanLabel(minimumPlan)} para desbloquear a biblioteca de assets.`}
              </p>
              {canManageBilling ? (
                <Link
                  href={"/dashboard/billing" as Route}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Ver planos disponiveis
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Apenas admins e leaders podem iniciar a upgrade do plano desta
                  organizacao.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
