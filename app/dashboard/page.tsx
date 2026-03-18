import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CalendarCheck2, ClipboardList, Smartphone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBillingOverview } from "@/modules/billing/server/repository";
import {
  canAccessFeatureWithSubscription,
  getPlanLabel,
} from "@/modules/billing/feature-access";
import { getDashboardNavigationForPlan } from "@/modules/dashboard/constants/navigation";

const metrics = [
  {
    title: "Voluntarios",
    value: "Live",
    description: "confirmacao mobile-first iniciada",
    icon: Smartphone,
  },
  {
    title: "Escalas",
    value: "12",
    description: "cultos planejados no mes",
    icon: CalendarCheck2,
  },
  {
    title: "Checklists",
    value: "32",
    description: "tarefas operacionais catalogadas",
    icon: ClipboardList,
  },
] as const;

export default function DashboardPage() {
  return <DashboardContent />;
}

async function DashboardContent() {
  const { organization } = await getBillingOverview();
  const assetsUnlocked = canAccessFeatureWithSubscription(
    organization.plan_type,
    organization.billing_subscription_status,
    "assets",
  );
  const navigationItems = getDashboardNavigationForPlan(
    organization.plan_type,
    organization.billing_subscription_status,
  );

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Rotas protegidas por Clerk e fluxo de organizacao ativa prontos para a
          camada de CRUD e integracao multi-tenant.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ title, value, description, icon: Icon }) => (
          <Card key={title} className="border-white/70 bg-white/85 shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{title}</CardTitle>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Assets</CardTitle>
            <div
              className={`rounded-2xl p-3 ${assetsUnlocked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
            >
              {assetsUnlocked ? <ShieldCheck className="size-5" /> : <LockKeyhole className="size-5" />}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {assetsUnlocked ? "Ready" : "Locked"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Plano atual: {getPlanLabel(organization.plan_type)}. A biblioteca de
              assets segue o gating por assinatura.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {navigationItems.map((item) =>
          item.hasAccess ? (
            <Link key={item.href} href={item.href as Route} className="block">
              <Card className="h-full border-border/70 bg-background/80 transition hover:border-primary/40 hover:bg-white/90">
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card
              key={item.href}
              className="h-full border-amber-200 bg-amber-50/70 shadow-soft"
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{item.title}</CardTitle>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                    <LockKeyhole className="size-3.5" />
                    {item.upgradeLabel}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-amber-900/80">
                  {item.description}
                </p>
                <p className="text-sm text-amber-900">
                  {item.accessReason === "subscription_inactive"
                    ? "A feature exige assinatura paga ativa para ficar liberada."
                    : `Disponivel a partir do plano ${item.upgradeLabel}.`}
                </p>
                <Link
                  href={"/dashboard/billing" as Route}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Ver upgrade
                </Link>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </section>
  );
}
