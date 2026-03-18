import type { SearchParams } from "next/dist/server/request/search-params";
import { BadgeCheck, CreditCard, LockKeyhole, RefreshCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasAbacatePayEnv } from "@/lib/env";
import {
  getFeatureAccessMatrix,
  getPlanChangeKind,
  getPlanLabel,
} from "@/modules/billing/feature-access";
import {
  refreshCheckoutStatusByIdAction,
  refreshLatestCheckoutStatusAction,
  startSubscriptionCheckoutAction,
} from "@/modules/billing/server/actions";
import { getBillingOverview } from "@/modules/billing/server/repository";
import { DashboardSetupState } from "@/modules/dashboard/components/dashboard-setup-state";
import {
  getDashboardSetupMessage,
  isDashboardSetupError,
} from "@/modules/dashboard/lib/setup-state";
import type {
  BillingPlanChangeKind,
  BillingSubscriptionStatus,
  BillingWebhookProcessingResult,
  ManagedPlanType,
  PlanType,
} from "@/modules/billing/types";

type BillingPageProps = {
  searchParams?: Promise<SearchParams>;
};

const planCards: Array<{
  description: string;
  features: string[];
  planType: ManagedPlanType;
  title: string;
}> = [
  {
    title: "Plano Pro",
    planType: "pro",
    description: "Escala, checklist e operacao dominical para uma equipe em crescimento.",
    features: [
      "Escalas e confirmacoes para toda a equipe",
      "Checklist operacional com timestamps",
      "Historico de checkout e webhook sincronizado",
    ],
  },
  {
    title: "Plano Premium",
    planType: "premium",
    description: "Camada premium para ministerios que querem previsibilidade e escala.",
    features: [
      "Tudo do Pro com espaco para evoluir automacoes",
      "Base pronta para monetizacao recorrente",
      "Fluxo de assinatura mais preparado para expansao futura",
    ],
  },
];

function formatDate(value: string | null) {
  if (!value) {
    return "Nao registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number | null) {
  if (typeof value !== "number") {
    return "Nao informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function getWebhookResultMeta(result: BillingWebhookProcessingResult) {
  switch (result) {
    case "processed":
      return {
        label: "Processado",
        tone: "bg-emerald-100 text-emerald-800",
      };
    case "ignored":
      return {
        label: "Ignorado",
        tone: "bg-amber-100 text-amber-800",
      };
    case "error":
      return {
        label: "Erro",
        tone: "bg-rose-100 text-rose-700",
      };
    default:
      return {
        label: "Recebido",
        tone: "bg-slate-100 text-slate-700",
      };
  }
}

function readMessage(value: string | string[] | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getSubscriptionStatusMeta(status: BillingSubscriptionStatus) {
  switch (status) {
    case "active":
      return {
        title: "Assinatura ativa",
        description: "As features pagas da organizacao estao liberadas conforme o plano contratado.",
        tone: "border-emerald-200 bg-emerald-50/90 text-emerald-900",
      };
    case "pending":
      return {
        title: "Assinatura pendente",
        description: "Existe uma contratacao em andamento, mas as features pagas so liberam quando o webhook confirmar ativacao.",
        tone: "border-amber-200 bg-amber-50/90 text-amber-900",
      };
    case "past_due":
      return {
        title: "Assinatura com pendencia",
        description: "As features pagas devem permanecer bloqueadas ate a regularizacao do billing.",
        tone: "border-rose-200 bg-rose-50/90 text-rose-900",
      };
    case "cancelled":
      return {
        title: "Assinatura cancelada",
        description: "A organizacao voltou ao acesso basico e precisa iniciar novo checkout para recuperar recursos pagos.",
        tone: "border-slate-200 bg-slate-100 text-slate-900",
      };
    default:
      return {
        title: "Assinatura inativa",
        description: "Nao ha assinatura paga ativa para esta organizacao neste momento.",
        tone: "border-slate-200 bg-slate-100 text-slate-900",
      };
  }
}

function getPlanCtaLabel(currentPlan: PlanType, targetPlan: ManagedPlanType) {
  const changeKind = getPlanChangeKind(currentPlan, targetPlan);

  switch (changeKind) {
    case "upgrade":
      return `Fazer upgrade para ${getPlanLabel(targetPlan)}`;
    case "downgrade":
      return `Trocar para ${getPlanLabel(targetPlan)}`;
    case "same_plan":
      return "Plano ativo";
    default:
      return `Assinar ${getPlanLabel(targetPlan)}`;
  }
}

function getPlanChangeDescription(changeKind: BillingPlanChangeKind, targetPlan: ManagedPlanType) {
  switch (changeKind) {
    case "upgrade":
      return `Move a organizacao para o plano ${getPlanLabel(targetPlan)} no proximo checkout confirmado.`;
    case "downgrade":
      return `Inicia a troca da assinatura atual para o plano ${getPlanLabel(targetPlan)}.`;
    case "same_plan":
      return "A organizacao ja esta operando neste plano com assinatura ativa.";
    default:
      return `Inicia a primeira assinatura paga da organizacao no plano ${getPlanLabel(targetPlan)}.`;
  }
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const rawSearchParams = await (searchParams ?? Promise.resolve({} satisfies SearchParams));
  let overview;

  try {
    overview = await getBillingOverview();
  } catch (error) {
    if (isDashboardSetupError(error)) {
      return (
        <DashboardSetupState
          title="Billing aguardando setup do tenant"
          errorMessage={getDashboardSetupMessage(error)}
        />
      );
    }

    throw error;
  }

  const resolvedSearchParams = rawSearchParams as {
    error?: string | string[];
    notice?: string | string[];
  };
  const errorMessage = readMessage(resolvedSearchParams.error);
  const noticeMessage = readMessage(resolvedSearchParams.notice);
  const abacatePayConfigured = hasAbacatePayEnv();
  const checkoutActionsEnabled = abacatePayConfigured && overview.canManageBilling;
  const featureMatrix = getFeatureAccessMatrix(
    overview.organization.plan_type,
    overview.organization.billing_subscription_status,
    [
    "serving",
    "schedules",
    "checklists",
    "assets",
    "premium_assets",
    ],
  );
  const subscriptionStatusMeta = getSubscriptionStatusMeta(
    overview.organization.billing_subscription_status,
  );
  const webhookSummary = {
    errors: overview.recentWebhookEvents.filter((event) => event.processing_result === "error")
      .length,
    ignored: overview.recentWebhookEvents.filter((event) => event.processing_result === "ignored")
      .length,
    processed: overview.recentWebhookEvents.filter(
      (event) => event.processing_result === "processed",
    ).length,
  };

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          Billing
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Fase 4 com Abacatepay: checkout recorrente, sincronizacao por webhook e
          protecao contra duplicidade de checkout.
        </p>
      </div>

      {errorMessage ? (
        <Card className="border-red-200 bg-red-50/90 shadow-soft">
          <CardContent className="py-4 text-sm font-medium text-red-700">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      {noticeMessage ? (
        <Card className="border-emerald-200 bg-emerald-50/90 shadow-soft">
          <CardContent className="py-4 text-sm font-medium text-emerald-700">
            {noticeMessage}
          </CardContent>
        </Card>
      ) : null}

      {!overview.canManageBilling ? (
        <Card className="border-amber-200 bg-amber-50/90 shadow-soft">
          <CardHeader>
            <CardTitle>Acesso restrito ao billing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900">
            Apenas admins e leaders da organizacao podem iniciar ou sincronizar
            assinaturas.
          </CardContent>
        </Card>
      ) : null}

      {!abacatePayConfigured ? (
        <Card className="border-amber-200 bg-amber-50/90 shadow-soft">
          <CardHeader>
            <CardTitle>Abacatepay ainda nao configurada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            <p>
              Configure as variaveis de ambiente da Abacatepay para liberar o checkout
              recorrente.
            </p>
            <p>
              Necessarias: <code>NEXT_PUBLIC_APP_URL</code>, <code>ABACATEPAY_API_KEY</code>,{" "}
              <code>ABACATEPAY_PUBLIC_KEY</code>, <code>ABACATEPAY_WEBHOOK_SECRET</code>,{" "}
              <code>ABACATEPAY_PRO_PRODUCT_ID</code> e <code>ABACATEPAY_PREMIUM_PRODUCT_ID</code>.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className={subscriptionStatusMeta.tone}>
        <CardHeader>
          <CardTitle>{subscriptionStatusMeta.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {subscriptionStatusMeta.description}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-slate-50/90 shadow-soft">
        <CardHeader>
          <CardTitle>Lifecycle de assinatura</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          O app ja diferencia nova assinatura, upgrade e downgrade. Cancelamento e
          reativacao ainda nao foram automatizados porque a documentacao oficial
          validada nesta etapa nao confirmou uma rota publica equivalente para esse
          fluxo.
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Plano atual</CardTitle>
            <BadgeCheck className="size-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold uppercase">{overview.organization.plan_type}</p>
            <p className="text-sm text-muted-foreground">
              Status da assinatura: {overview.organization.billing_subscription_status}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Assinatura</CardTitle>
            <CreditCard className="size-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Subscription ID:{" "}
              <span className="font-medium text-foreground">
                {overview.organization.billing_subscription_id ?? "Nao sincronizada"}
              </span>
            </p>
            <p>
              Cliente:{" "}
              <span className="font-medium text-foreground">
                {overview.organization.billing_customer_id ?? "Nao identificado"}
              </span>
            </p>
            <p>
              Ultima ativacao:{" "}
              <span className="font-medium text-foreground">
                {formatDate(overview.organization.billing_plan_activated_at)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Seguranca do webhook</CardTitle>
            <ShieldCheck className="size-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Secret via query string</p>
            <p>Assinatura HMAC validada no header</p>
            <p>Idempotencia por hash do payload</p>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/85 shadow-soft">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Observabilidade</CardTitle>
            <BadgeCheck className="size-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Processados: {webhookSummary.processed}</p>
            <p>Ignorados: {webhookSummary.ignored}</p>
            <p>Erros recentes: {webhookSummary.errors}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {planCards.map((plan) => {
          const changeKind = getPlanChangeKind(overview.organization.plan_type, plan.planType);
          const isCurrentActivePlan =
            overview.organization.plan_type === plan.planType &&
            overview.organization.billing_subscription_status === "active";

          return (
            <Card
              key={plan.planType}
              className="border-border/70 bg-background/85 shadow-soft"
            >
              <CardHeader className="space-y-3">
                <div className="space-y-1">
                  <CardTitle>{plan.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <p className="text-sm font-medium text-foreground/80">
                    {getPlanChangeDescription(changeKind, plan.planType)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <form action={startSubscriptionCheckoutAction}>
                  <input type="hidden" name="planType" value={plan.planType} />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!checkoutActionsEnabled || isCurrentActivePlan}
                    className="w-full"
                  >
                    {getPlanCtaLabel(overview.organization.plan_type, plan.planType)}
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/70 bg-background/80">
        <CardHeader className="space-y-2">
          <CardTitle>Cobertura de acesso por plano</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta matriz centraliza o gating atual das areas do dashboard para evitar
            regras espalhadas entre telas.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {featureMatrix.map((feature) => (
            <div
              key={feature.feature}
              className={`rounded-[22px] border p-4 ${
                feature.hasAccess
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-amber-200 bg-amber-50/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{feature.label}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                {feature.hasAccess ? (
                  <BadgeCheck className="size-5 text-emerald-700" />
                ) : (
                  <LockKeyhole className="size-5 text-amber-700" />
                )}
              </div>
              <p className="mt-3 text-sm text-foreground/80">
                Plano minimo: {getPlanLabel(feature.minimumPlan)}
              </p>
              {!feature.hasAccess ? (
                <p className="mt-2 text-sm text-foreground/70">
                  {feature.reason === "subscription_inactive"
                    ? "Bloqueado porque a assinatura paga nao esta ativa."
                    : "Bloqueado porque o plano atual nao atende o minimo exigido."}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-background/80">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Ultimo checkout gerado</CardTitle>
          <form action={refreshLatestCheckoutStatusAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!checkoutActionsEnabled || !overview.latestCheckout}
            >
              <RefreshCcw className="mr-2 size-4" />
              Sincronizar status
            </Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {overview.latestCheckout ? (
            <>
              <p>External ID: {overview.latestCheckout.external_id}</p>
              <p>Status: {overview.latestCheckout.checkout_status}</p>
              <p>Plano: {overview.latestCheckout.plan_type}</p>
              <p>Criado em: {formatDate(overview.latestCheckout.created_at)}</p>
            </>
          ) : (
            <p>Nenhum checkout recorrente foi iniciado para esta organizacao ainda.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70 bg-background/80">
          <CardHeader>
            <CardTitle>Historico administrativo de checkouts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentCheckouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum checkout de billing registrado para esta organizacao ainda.
              </p>
            ) : (
              overview.recentCheckouts.map((checkout) => (
                <div
                  key={checkout.id}
                  className="rounded-[22px] border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{checkout.external_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Plano {getPlanLabel(checkout.plan_type)} - Status {checkout.checkout_status}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valor: {formatCurrency(checkout.amount)} - Criado em{" "}
                        {formatDate(checkout.created_at)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pago em: {formatDate(checkout.paid_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <form action={refreshCheckoutStatusByIdAction}>
                        <input type="hidden" name="checkoutId" value={checkout.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          disabled={!checkoutActionsEnabled}
                        >
                          Sincronizar
                        </Button>
                      </form>
                      {checkout.checkout_url ? (
                        <a
                          href={checkout.checkout_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                        >
                          Abrir checkout
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-background/80">
          <CardHeader>
            <CardTitle>Eventos recentes de webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentWebhookEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum evento de webhook foi registrado para esta organizacao ainda.
              </p>
            ) : (
              overview.recentWebhookEvents.map((event) => (
                (() => {
                  const resultMeta = getWebhookResultMeta(event.processing_result);

                  return (
                    <div
                      key={event.id}
                      className="rounded-[22px] border border-border/70 bg-background/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-foreground">{event.event_name}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${resultMeta.tone}`}
                        >
                          {resultMeta.label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Processado em {formatDate(event.processed_at)}
                      </p>
                      {event.processing_note ? (
                        <p className="mt-2 text-sm text-foreground/80">
                          {event.processing_note}
                        </p>
                      ) : null}
                      {event.checkout_external_id ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Checkout: {event.checkout_external_id}
                        </p>
                      ) : null}
                      {event.subscription_id ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Subscription: {event.subscription_id}
                        </p>
                      ) : null}
                      <p className="mt-2 break-all text-xs text-muted-foreground">
                        Hash: {event.payload_hash}
                      </p>
                    </div>
                  );
                })()
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
