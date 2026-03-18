export type BillingProvider = "abacatepay";
export type PlanType = "basic" | "pro" | "premium";

export type BillingCheckoutStatus =
  | "pending"
  | "paid"
  | "expired"
  | "cancelled"
  | "refunded"
  | "disputed";

export type BillingSubscriptionStatus =
  | "pending"
  | "active"
  | "cancelled"
  | "past_due"
  | "inactive";

export type BillingWebhookProcessingResult =
  | "received"
  | "processed"
  | "ignored"
  | "error";

export type ManagedPlanType = Exclude<PlanType, "basic">;
export type BillingPlanChangeKind =
  | "new_subscription"
  | "upgrade"
  | "downgrade"
  | "same_plan";

export interface BillingOrganizationRecord {
  id: string;
  name: string;
  slug: string;
  plan_type: PlanType;
  billing_provider: BillingProvider | null;
  billing_customer_id: string | null;
  billing_subscription_id: string | null;
  billing_subscription_status: BillingSubscriptionStatus;
  billing_current_period_ends_at: string | null;
  billing_plan_activated_at: string | null;
}

export interface BillingCheckoutRecord {
  id: string;
  org_id: string;
  provider: BillingProvider;
  external_id: string;
  provider_checkout_id: string | null;
  provider_customer_id: string | null;
  plan_type: PlanType;
  checkout_status: BillingCheckoutStatus;
  amount: number | null;
  checkout_url: string | null;
  completion_url: string | null;
  return_url: string | null;
  metadata: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingWebhookEventPayload {
  event?: string;
  data?: Record<string, unknown> | null;
  apiVersion?: number;
  devMode?: boolean;
}

export interface BillingOverview {
  canManageBilling: boolean;
  organization: BillingOrganizationRecord;
  latestCheckout: BillingCheckoutRecord | null;
  recentCheckouts: BillingCheckoutRecord[];
  recentWebhookEvents: BillingWebhookEventRecord[];
}

export interface BillingWebhookEventRecord {
  checkout_external_id: string | null;
  checkout_id: string | null;
  id: string;
  provider: BillingProvider;
  payload_hash: string;
  event_name: string;
  org_id: string | null;
  payload: Record<string, unknown>;
  processing_note: string | null;
  processing_result: BillingWebhookProcessingResult;
  processed_at: string;
  created_at: string;
  subscription_id: string | null;
}

export interface AbacatePayCreateSubscriptionCheckoutRequest {
  items: Array<{
    id: string;
    quantity: number;
  }>;
  methods: ["CARD"];
  completionUrl: string;
  returnUrl: string;
  externalId: string;
  metadata: Record<string, unknown>;
}

export interface AbacatePaySubscriptionCheckout {
  id: string;
  externalId: string | null;
  url: string;
  amount: number | null;
  status: string | null;
  customerId: string | null;
  completionUrl: string | null;
  returnUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AbacatePaySubscriptionCheckoutListResponse {
  items: AbacatePaySubscriptionCheckout[];
}
