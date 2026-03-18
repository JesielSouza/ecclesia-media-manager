import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { createRequestScopedSupabaseClient } from "@/lib/supabase/request-scoped";
import { requireActiveSessionContext } from "@/modules/auth/server/session";
import { createAbacatePayClient } from "@/modules/billing/abacatepay";
import { getPlanChangeKind } from "@/modules/billing/feature-access";
import { resolveScheduleTenantContext } from "@/modules/schedules/server/repository";
import type {
  BillingPlanChangeKind,
  BillingCheckoutRecord,
  BillingOverview,
  BillingOrganizationRecord,
  BillingSubscriptionStatus,
  BillingWebhookProcessingResult,
  BillingWebhookEventRecord,
  BillingWebhookEventPayload,
  ManagedPlanType,
  PlanType,
} from "@/modules/billing/types";

type OrganizationLookup = BillingOrganizationRecord & {
  clerk_org_id: string | null;
};

type SubscriptionEventDetails = {
  customerId: string | null;
  externalId: string | null;
  planType: PlanType;
  subscriptionAmount: number | null;
  subscriptionFrequency: string | null;
  subscriptionId: string | null;
  subscriptionStatus: BillingSubscriptionStatus;
  subscriptionUpdatedAt: string | null;
};

const BILLING_PATH = "/dashboard/billing";
const MANAGEABLE_ROLES = new Set(["admin", "leader", "org:admin"]);

function getAdminSupabase() {
  return createSupabaseAdminClient();
}

function getAppSupabase(params: {
  accessToken?: string | null;
  clerkOrgId: string;
  organizationId?: string | null;
  userId: string;
}) {
  return createRequestScopedSupabaseClient(params);
}

function normalizePlanType(value: string | null | undefined): PlanType | null {
  return value === "basic" || value === "pro" || value === "premium" ? value : null;
}

function normalizeSubscriptionStatus(
  value: string | null | undefined,
): BillingSubscriptionStatus {
  switch (value?.toUpperCase()) {
    case "ACTIVE":
      return "active";
    case "CANCELLED":
      return "cancelled";
    case "PAST_DUE":
      return "past_due";
    case "INACTIVE":
      return "inactive";
    default:
      return "pending";
  }
}

function mapCheckoutStatus(
  eventName: string,
): BillingCheckoutRecord["checkout_status"] | null {
  switch (eventName) {
    case "subscription.completed":
    case "subscription.renewed":
      return "paid";
    case "subscription.cancelled":
      return "cancelled";
    default:
      return null;
  }
}

function mapRemoteCheckoutStatus(
  value: string | null | undefined,
): BillingCheckoutRecord["checkout_status"] | null {
  switch (value?.toUpperCase()) {
    case "PENDING":
      return "pending";
    case "PAID":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    default:
      return null;
  }
}

function getManagedProductId(planType: ManagedPlanType) {
  return planType === "premium"
    ? env.server.abacatePayPremiumProductId
    : env.server.abacatePayProProductId;
}

async function resolveOrganizationByClerkOrgId(
  clerkOrgId: string,
  accessToken: string | null,
  userId: string,
): Promise<OrganizationLookup> {
  const supabase = getAppSupabase({ accessToken, clerkOrgId, userId });
  const { data, error } = await supabase
    .from("organizations")
    .select(
      [
        "id",
        "name",
        "slug",
        "plan_type",
        "clerk_org_id",
        "billing_provider",
        "billing_customer_id",
        "billing_subscription_id",
        "billing_subscription_status",
        "billing_current_period_ends_at",
        "billing_plan_activated_at",
      ].join(", "),
    )
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle<OrganizationLookup>();

  if (error) {
    throw new Error(`Falha ao localizar a organizacao ativa: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "A organizacao ativa do Clerk ainda nao foi sincronizada com o Supabase.",
    );
  }

  return data;
}

async function assertBillingManagerAccess() {
  const session = await requireActiveSessionContext(BILLING_PATH);
  const context = await resolveScheduleTenantContext();
  const canManageBilling =
    context.canManageSchedules ||
    MANAGEABLE_ROLES.has(context.actorProfileRole ?? "") ||
    MANAGEABLE_ROLES.has(session.orgRole ?? "");

  if (!canManageBilling) {
    throw new Error(
      "Apenas admins e leaders da organizacao podem gerenciar o billing.",
    );
  }

  return {
    ...context,
    orgRole: session.orgRole,
  };
}

async function findCheckoutByExternalId(externalId: string) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("billing_checkouts")
    .select("*")
    .eq("provider", "abacatepay")
    .eq("external_id", externalId)
    .maybeSingle<BillingCheckoutRecord>();

  if (error) {
    throw new Error(`Falha ao localizar checkout de billing: ${error.message}`);
  }

  return data;
}

function buildBillingCompletionMessage(changeKind: BillingPlanChangeKind, planType: ManagedPlanType) {
  switch (changeKind) {
    case "upgrade":
      return `Upgrade para ${planType} iniciado. Aguardando confirmacao do webhook da Abacatepay.`;
    case "downgrade":
      return `Troca para ${planType} iniciada. Aguardando confirmacao do webhook da Abacatepay.`;
    case "new_subscription":
      return `Assinatura ${planType} iniciada. Aguardando confirmacao do webhook da Abacatepay.`;
    default:
      return "Pagamento concluido. Aguardando confirmacao do webhook da Abacatepay.";
  }
}

async function registerWebhookEvent(params: {
  checkoutExternalId?: string | null;
  checkoutId?: string | null;
  eventName: string;
  orgId: string | null;
  payload: BillingWebhookEventPayload;
  payloadHash: string;
  processingNote?: string | null;
  processingResult?: BillingWebhookProcessingResult;
  subscriptionId?: string | null;
}) {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("billing_webhook_events")
    .insert({
      provider: "abacatepay",
      payload_hash: params.payloadHash,
      event_name: params.eventName,
      org_id: params.orgId,
      payload: params.payload,
      processing_result: params.processingResult ?? "received",
      processing_note: params.processingNote ?? null,
      checkout_id: params.checkoutId ?? null,
      checkout_external_id: params.checkoutExternalId ?? null,
      subscription_id: params.subscriptionId ?? null,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error && error.code === "23505") {
    return null;
  }

  if (error) {
    throw new Error(`Falha ao registrar evento de billing: ${error.message}`);
  }

  return data?.id ?? null;
}

async function updateWebhookEventProcessing(params: {
  checkoutExternalId?: string | null;
  checkoutId?: string | null;
  id: string;
  processingNote?: string | null;
  processingResult: BillingWebhookProcessingResult;
  subscriptionId?: string | null;
}) {
  const supabase = getAdminSupabase();
  const { error } = await supabase
    .from("billing_webhook_events")
    .update({
      processing_result: params.processingResult,
      processing_note: params.processingNote ?? null,
      checkout_id: params.checkoutId ?? null,
      checkout_external_id: params.checkoutExternalId ?? null,
      subscription_id: params.subscriptionId ?? null,
    })
    .eq("id", params.id);

  if (error) {
    throw new Error(`Falha ao atualizar o resultado do webhook: ${error.message}`);
  }
}

function extractSubscriptionEventDetails(
  payload: BillingWebhookEventPayload,
): SubscriptionEventDetails | null {
  const data = payload.data;

  if (!data || typeof data !== "object") {
    return null;
  }

  const subscription =
    "subscription" in data && data.subscription && typeof data.subscription === "object"
      ? (data.subscription as Record<string, unknown>)
      : null;
  const payment =
    "payment" in data && data.payment && typeof data.payment === "object"
      ? (data.payment as Record<string, unknown>)
      : null;
  const customer =
    "customer" in data && data.customer && typeof data.customer === "object"
      ? (data.customer as Record<string, unknown>)
      : null;

  if (!subscription) {
    return null;
  }

  const metadata =
    "metadata" in data && data.metadata && typeof data.metadata === "object"
      ? (data.metadata as Record<string, unknown>)
      : null;

  const planType =
    normalizePlanType(
      typeof metadata?.planType === "string" ? metadata.planType : undefined,
    ) ??
    normalizePlanType(
      typeof payment?.externalId === "string"
        ? payment.externalId.split("_").at(-1)
        : undefined,
    ) ??
    "basic";

  return {
    customerId: typeof customer?.id === "string" ? customer.id : null,
    externalId: typeof payment?.externalId === "string" ? payment.externalId : null,
    planType,
    subscriptionAmount:
      typeof subscription.amount === "number" ? subscription.amount : null,
    subscriptionFrequency:
      typeof subscription.frequency === "string" ? subscription.frequency : null,
    subscriptionId: typeof subscription.id === "string" ? subscription.id : null,
    subscriptionStatus: normalizeSubscriptionStatus(
      typeof subscription.status === "string" ? subscription.status : undefined,
    ),
    subscriptionUpdatedAt:
      typeof subscription.updatedAt === "string" ? subscription.updatedAt : null,
  };
}

export async function getBillingOverview(): Promise<BillingOverview> {
  const session = await requireActiveSessionContext(BILLING_PATH);
  const scheduleContext = await resolveScheduleTenantContext();
  const organization = await resolveOrganizationByClerkOrgId(
    session.orgId,
    session.supabaseAccessToken,
    session.userId,
  );
  const supabase = getAppSupabase({
    accessToken: session.supabaseAccessToken,
    clerkOrgId: session.orgId,
    organizationId: organization.id,
    userId: session.userId,
  });
  const [
    { data: recentCheckouts, error: checkoutsError },
    { data: recentWebhookEvents, error: webhookEventsError },
  ] = await Promise.all([
    supabase
      .from("billing_checkouts")
      .select("*")
      .eq("org_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<BillingCheckoutRecord[]>(),
    supabase
      .from("billing_webhook_events")
      .select("*")
      .eq("provider", "abacatepay")
      .eq("org_id", organization.id)
      .order("processed_at", { ascending: false })
      .limit(8)
      .returns<BillingWebhookEventRecord[]>(),
  ]);

  if (checkoutsError) {
    throw new Error(`Falha ao carregar o historico de billing: ${checkoutsError.message}`);
  }

  if (webhookEventsError) {
    throw new Error(
      `Falha ao carregar os eventos de webhook do billing: ${webhookEventsError.message}`,
    );
  }

  return {
    canManageBilling:
      scheduleContext.canManageSchedules ||
      MANAGEABLE_ROLES.has(scheduleContext.actorProfileRole ?? "") ||
      MANAGEABLE_ROLES.has(session.orgRole ?? ""),
    organization,
    latestCheckout: recentCheckouts?.[0] ?? null,
    recentCheckouts: recentCheckouts ?? [],
    recentWebhookEvents: recentWebhookEvents ?? [],
  };
}

export async function createSubscriptionCheckout(planType: ManagedPlanType) {
  const context = await assertBillingManagerAccess();
  const organization = await resolveOrganizationByClerkOrgId(
    context.clerkOrgId,
    context.supabaseAccessToken,
    context.userId,
  );
  const supabase = getAppSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: organization.id,
    userId: context.userId,
  });
  const planChangeKind = getPlanChangeKind(organization.plan_type, planType);

  if (
    organization.plan_type === planType &&
    organization.billing_subscription_status === "active"
  ) {
    throw new Error("A organizacao ja possui uma assinatura ativa nesse plano.");
  }

  const { data: existingPendingCheckout, error: pendingCheckoutError } = await supabase
    .from("billing_checkouts")
    .select("*")
    .eq("org_id", organization.id)
    .eq("provider", "abacatepay")
    .eq("plan_type", planType)
    .eq("checkout_status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<BillingCheckoutRecord>();

  if (pendingCheckoutError) {
    throw new Error(
      `Falha ao verificar checkout pendente da organizacao: ${pendingCheckoutError.message}`,
    );
  }

  if (existingPendingCheckout?.checkout_url) {
    return existingPendingCheckout.checkout_url;
  }

  const now = Date.now();
  const externalId = `emm_${organization.id}_${planType}_${now}`;
  const completionUrl = `${env.public.appUrl}${BILLING_PATH}?notice=${encodeURIComponent(
    buildBillingCompletionMessage(planChangeKind, planType),
  )}`;
  const returnUrl = `${env.public.appUrl}${BILLING_PATH}`;

  const client = createAbacatePayClient();
  const checkout = await client.createSubscriptionCheckout({
    items: [
      {
        id: getManagedProductId(planType),
        quantity: 1,
      },
    ],
    methods: ["CARD"],
    completionUrl,
    returnUrl,
    externalId,
    metadata: {
      clerkOrgId: context.clerkOrgId,
      orgId: organization.id,
      planChangeKind,
      planType,
    },
  });

  const { error } = await supabase.from("billing_checkouts").insert({
    org_id: organization.id,
    provider: "abacatepay",
    external_id: externalId,
    provider_checkout_id: checkout.id,
    provider_customer_id: checkout.customerId,
    plan_type: planType,
    checkout_status: "pending",
    amount: checkout.amount,
    checkout_url: checkout.url,
    completion_url: completionUrl,
    return_url: returnUrl,
    metadata: {
      abacatepayStatus: checkout.status,
      abacatepayUpdatedAt: checkout.updatedAt,
      planChangeKind,
    },
  });

  if (error) {
    throw new Error(`Falha ao registrar o checkout localmente: ${error.message}`);
  }

  return checkout.url;
}

export async function refreshLatestCheckoutStatus() {
  const context = await assertBillingManagerAccess();
  const organization = await resolveOrganizationByClerkOrgId(
    context.clerkOrgId,
    context.supabaseAccessToken,
    context.userId,
  );
  const supabase = getAppSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: organization.id,
    userId: context.userId,
  });
  const { data: latestCheckout, error } = await supabase
    .from("billing_checkouts")
    .select("*")
    .eq("org_id", organization.id)
    .eq("provider", "abacatepay")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<BillingCheckoutRecord>();

  if (error) {
    throw new Error(`Falha ao localizar o ultimo checkout: ${error.message}`);
  }

  if (!latestCheckout) {
    throw new Error("Nao existe checkout recorrente para sincronizar.");
  }

  const client = createAbacatePayClient();
  const result = await client.listSubscriptionCheckouts({
    externalId: latestCheckout.external_id,
    limit: 1,
  });
  const remoteCheckout = result.items[0];

  if (!remoteCheckout) {
    throw new Error("A Abacatepay nao retornou o checkout solicitado.");
  }

  const normalizedStatus = mapRemoteCheckoutStatus(remoteCheckout.status);

  if (!normalizedStatus) {
    throw new Error("A Abacatepay retornou um status de checkout desconhecido.");
  }

  const { error: updateError } = await supabase
    .from("billing_checkouts")
    .update({
      provider_checkout_id: remoteCheckout.id,
      provider_customer_id: remoteCheckout.customerId,
      checkout_status: normalizedStatus,
      amount: remoteCheckout.amount,
      checkout_url: remoteCheckout.url,
      completion_url: remoteCheckout.completionUrl,
      return_url: remoteCheckout.returnUrl,
      metadata: {
        abacatepayStatus: remoteCheckout.status,
        abacatepayUpdatedAt: remoteCheckout.updatedAt,
      },
    })
    .eq("id", latestCheckout.id);

  if (updateError) {
    throw new Error(`Falha ao atualizar o checkout local: ${updateError.message}`);
  }

  return normalizedStatus;
}

export async function refreshCheckoutStatusById(checkoutId: string) {
  const context = await assertBillingManagerAccess();
  const organization = await resolveOrganizationByClerkOrgId(
    context.clerkOrgId,
    context.supabaseAccessToken,
    context.userId,
  );
  const supabase = getAppSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: organization.id,
    userId: context.userId,
  });
  const { data: checkout, error } = await supabase
    .from("billing_checkouts")
    .select("*")
    .eq("org_id", organization.id)
    .eq("provider", "abacatepay")
    .eq("id", checkoutId)
    .maybeSingle<BillingCheckoutRecord>();

  if (error) {
    throw new Error(`Falha ao localizar o checkout solicitado: ${error.message}`);
  }

  if (!checkout) {
    throw new Error("Checkout de billing nao encontrado para a organizacao ativa.");
  }

  const client = createAbacatePayClient();
  const result = await client.listSubscriptionCheckouts({
    externalId: checkout.external_id,
    limit: 1,
  });
  const remoteCheckout = result.items[0];

  if (!remoteCheckout) {
    throw new Error("A Abacatepay nao retornou o checkout solicitado.");
  }

  const normalizedStatus = mapRemoteCheckoutStatus(remoteCheckout.status);

  if (!normalizedStatus) {
    throw new Error("A Abacatepay retornou um status de checkout desconhecido.");
  }

  const { error: updateError } = await supabase
    .from("billing_checkouts")
    .update({
      provider_checkout_id: remoteCheckout.id,
      provider_customer_id: remoteCheckout.customerId,
      checkout_status: normalizedStatus,
      amount: remoteCheckout.amount,
      checkout_url: remoteCheckout.url,
      completion_url: remoteCheckout.completionUrl,
      return_url: remoteCheckout.returnUrl,
      metadata: {
        abacatepayStatus: remoteCheckout.status,
        abacatepayUpdatedAt: remoteCheckout.updatedAt,
      },
    })
    .eq("id", checkout.id);

  if (updateError) {
    throw new Error(`Falha ao atualizar o checkout local: ${updateError.message}`);
  }

  return {
    externalId: checkout.external_id,
    status: normalizedStatus,
  };
}

export async function processAbacatePayWebhook(params: {
  payload: BillingWebhookEventPayload;
  payloadHash: string;
}) {
  const eventName = typeof params.payload.event === "string" ? params.payload.event : null;

  if (!eventName) {
    throw new Error("Evento de billing recebido sem nome.");
  }

  const details = extractSubscriptionEventDetails(params.payload);
  const checkout = details?.externalId
    ? await findCheckoutByExternalId(details.externalId)
    : null;
  const webhookEventId = await registerWebhookEvent({
    checkoutExternalId: details?.externalId ?? null,
    checkoutId: checkout?.id ?? null,
    eventName,
    orgId: checkout?.org_id ?? null,
    payload: params.payload,
    payloadHash: params.payloadHash,
    processingNote:
      !details
        ? "Payload sem estrutura esperada de assinatura."
        : !checkout
          ? "Evento recebido sem checkout local correspondente."
          : "Evento recebido e aguardando processamento.",
    processingResult:
      !details || !checkout
        ? "ignored"
        : "received",
    subscriptionId: details?.subscriptionId ?? null,
  });

  if (!webhookEventId) {
    return { deduplicated: true, processingResult: "ignored" as const };
  }

  if (!details || !checkout) {
    return { deduplicated: false, ignored: true, processingResult: "ignored" as const };
  }

  try {
    const supabase = getAdminSupabase();
    const checkoutStatus = mapCheckoutStatus(eventName);

    if (checkoutStatus) {
      const { error: checkoutError } = await supabase
        .from("billing_checkouts")
        .update({
          provider_customer_id: details.customerId,
          checkout_status: checkoutStatus,
          paid_at:
            eventName === "subscription.completed" || eventName === "subscription.renewed"
              ? details.subscriptionUpdatedAt
              : null,
          metadata: {
            subscriptionAmount: details.subscriptionAmount,
            subscriptionFrequency: details.subscriptionFrequency,
            subscriptionId: details.subscriptionId,
            webhookEvent: eventName,
          },
        })
        .eq("id", checkout.id);

      if (checkoutError) {
        throw new Error(`Falha ao atualizar checkout de billing: ${checkoutError.message}`);
      }
    }

    const targetPlan =
      details.subscriptionStatus === "active" ? checkout.plan_type : ("basic" as const);

    const { error: organizationError } = await supabase
      .from("organizations")
      .update({
        plan_type: targetPlan,
        billing_provider: "abacatepay",
        billing_customer_id: details.customerId,
        billing_subscription_id: details.subscriptionId,
        billing_subscription_status: details.subscriptionStatus,
        billing_current_period_ends_at: details.subscriptionUpdatedAt,
        billing_plan_activated_at:
          details.subscriptionStatus === "active" ? details.subscriptionUpdatedAt : null,
      })
      .eq("id", checkout.org_id);

    if (organizationError) {
      throw new Error(
        `Falha ao atualizar assinatura da organizacao: ${organizationError.message}`,
      );
    }

    await updateWebhookEventProcessing({
      id: webhookEventId,
      processingResult: "processed",
      processingNote: "Evento aplicado com sucesso ao checkout e ao tenant.",
      checkoutId: checkout.id,
      checkoutExternalId: details.externalId,
      subscriptionId: details.subscriptionId,
    });

    return { deduplicated: false, ignored: false, processingResult: "processed" as const };
  } catch (error) {
    await updateWebhookEventProcessing({
      id: webhookEventId,
      processingResult: "error",
      processingNote:
        error instanceof Error
          ? error.message
          : "Falha desconhecida ao processar webhook de billing.",
      checkoutId: checkout.id,
      checkoutExternalId: details.externalId,
      subscriptionId: details.subscriptionId,
    });

    throw error;
  }
}
