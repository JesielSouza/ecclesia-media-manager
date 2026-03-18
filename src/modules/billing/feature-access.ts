import type {
  BillingPlanChangeKind,
  BillingSubscriptionStatus,
  PlanType,
} from "@/modules/billing/types";

export type FeatureKey =
  | "billing"
  | "serving"
  | "schedules"
  | "checklists"
  | "assets"
  | "premium_assets";

type FeatureRule = {
  description: string;
  label: string;
  minimumPlan: PlanType;
};

export type FeatureAccess = {
  feature: FeatureKey;
  hasAccess: boolean;
  label: string;
  description: string;
  minimumPlan: PlanType;
  reason: "ok" | "plan_required" | "subscription_inactive";
};

const FEATURE_RULES: Record<FeatureKey, FeatureRule> = {
  billing: {
    label: "Billing",
    description: "Gestao da assinatura recorrente e sincronizacao com Abacatepay.",
    minimumPlan: "basic",
  },
  serving: {
    label: "Minha escala",
    description: "Fluxo mobile-first para voluntarios responderem suas escalas.",
    minimumPlan: "basic",
  },
  schedules: {
    label: "Escalas",
    description: "Planejamento de cultos, alocacao e follow-up operacional.",
    minimumPlan: "basic",
  },
  checklists: {
    label: "Checklists",
    description: "Execucao operacional com templates e logs por organizacao.",
    minimumPlan: "basic",
  },
  assets: {
    label: "Assets",
    description: "Biblioteca de materiais, links e recursos compartilhados.",
    minimumPlan: "pro",
  },
  premium_assets: {
    label: "Assets Premium",
    description: "Camada premium reservada para expansoes avancadas de assets.",
    minimumPlan: "premium",
  },
};

const PLAN_RANK: Record<PlanType, number> = {
  basic: 0,
  pro: 1,
  premium: 2,
};

export function canAccessFeature(planType: PlanType, feature: FeatureKey) {
  return PLAN_RANK[planType] >= PLAN_RANK[FEATURE_RULES[feature].minimumPlan];
}

export function hasActivePaidAccess(
  planType: PlanType,
  subscriptionStatus: BillingSubscriptionStatus,
) {
  if (planType === "basic") {
    return true;
  }

  return subscriptionStatus === "active";
}

export function canAccessFeatureWithSubscription(
  planType: PlanType,
  subscriptionStatus: BillingSubscriptionStatus,
  feature: FeatureKey,
) {
  const satisfiesPlan = canAccessFeature(planType, feature);

  if (!satisfiesPlan) {
    return false;
  }

  if (FEATURE_RULES[feature].minimumPlan === "basic") {
    return true;
  }

  return hasActivePaidAccess(planType, subscriptionStatus);
}

export function getFeatureMinimumPlan(feature: FeatureKey) {
  return FEATURE_RULES[feature].minimumPlan;
}

export function getFeatureAccess(
  planType: PlanType,
  subscriptionStatus: BillingSubscriptionStatus,
  feature: FeatureKey,
): FeatureAccess {
  const satisfiesPlan = canAccessFeature(planType, feature);
  const hasAccess = canAccessFeatureWithSubscription(
    planType,
    subscriptionStatus,
    feature,
  );

  return {
    feature,
    hasAccess,
    label: FEATURE_RULES[feature].label,
    description: FEATURE_RULES[feature].description,
    minimumPlan: getFeatureMinimumPlan(feature),
    reason: !satisfiesPlan
      ? "plan_required"
      : hasAccess
        ? "ok"
        : "subscription_inactive",
  };
}

export function getFeatureAccessMatrix(
  planType: PlanType,
  subscriptionStatus: BillingSubscriptionStatus,
  features?: FeatureKey[],
) {
  const keys = features ?? (Object.keys(FEATURE_RULES) as FeatureKey[]);

  return keys.map((feature) => getFeatureAccess(planType, subscriptionStatus, feature));
}

export function getPlanLabel(planType: PlanType) {
  switch (planType) {
    case "premium":
      return "Premium";
    case "pro":
      return "Pro";
    default:
      return "Basic";
  }
}

export function getPlanChangeKind(
  currentPlan: PlanType,
  targetPlan: Exclude<PlanType, "basic">,
): BillingPlanChangeKind {
  if (currentPlan === targetPlan) {
    return "same_plan";
  }

  if (currentPlan === "basic") {
    return "new_subscription";
  }

  return PLAN_RANK[targetPlan] > PLAN_RANK[currentPlan] ? "upgrade" : "downgrade";
}
