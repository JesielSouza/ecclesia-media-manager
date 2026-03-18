import type { FeatureKey } from "@/modules/billing/feature-access";
import type { BillingSubscriptionStatus, PlanType } from "@/modules/billing/types";
import { getFeatureAccess, getPlanLabel } from "@/modules/billing/feature-access";

export type DashboardNavigationItem = {
  title: string;
  href:
    | "/dashboard/assets"
    | "/dashboard/billing"
    | "/dashboard/checklists"
    | "/dashboard/schedules"
    | "/dashboard/serving";
  description: string;
  feature?: FeatureKey;
};

export const dashboardNavigation: DashboardNavigationItem[] = [
  {
    title: "Billing",
    href: "/dashboard/billing",
    description: "Gerencie a assinatura recorrente da organizacao com Abacatepay.",
    feature: "billing",
  },
  {
    title: "Minha escala",
    href: "/dashboard/serving",
    description: "Fluxo mobile-first para voluntarios confirmarem sua participacao.",
    feature: "serving",
  },
  {
    title: "Escalas",
    href: "/dashboard/schedules",
    description: "Gerencie escalas e confirmacoes por culto.",
    feature: "schedules",
  },
  {
    title: "Checklists",
    href: "/dashboard/checklists",
    description: "Padronize o pre-culto com visibilidade operacional.",
    feature: "checklists",
  },
  {
    title: "Assets",
    href: "/dashboard/assets",
    description: "Centralize links e materiais do ministerio de midia.",
    feature: "assets",
  },
] as const;

export function getDashboardNavigationForPlan(
  planType: PlanType,
  subscriptionStatus: BillingSubscriptionStatus,
) {
  return dashboardNavigation.map((item) => {
    if (!item.feature) {
      return {
        ...item,
        hasAccess: true,
        upgradeLabel: null,
        accessReason: "ok" as const,
      };
    }

    const access = getFeatureAccess(planType, subscriptionStatus, item.feature);

    return {
      ...item,
      hasAccess: access.hasAccess,
      accessReason: access.reason,
      upgradeLabel: getPlanLabel(access.minimumPlan),
    };
  });
}
