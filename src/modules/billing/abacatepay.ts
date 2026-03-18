import crypto from "node:crypto";

import { env } from "@/lib/env";
import type {
  AbacatePayCreateSubscriptionCheckoutRequest,
  AbacatePaySubscriptionCheckoutListResponse,
  AbacatePaySubscriptionCheckout,
} from "@/modules/billing/types";

const ABACATEPAY_API_BASE_URL = "https://api.abacatepay.com/v2";

type AbacatePayApiResponse<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
};

export class AbacatePayClient {
  async createSubscriptionCheckout(
    payload: AbacatePayCreateSubscriptionCheckoutRequest,
  ): Promise<AbacatePaySubscriptionCheckout> {
    const response = await fetch(`${ABACATEPAY_API_BASE_URL}/subscriptions/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.server.abacatePayApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = (await response.json()) as AbacatePayApiResponse<AbacatePaySubscriptionCheckout>;

    if (!response.ok || !body.success || !body.data) {
      throw new Error(
        body.error || "A Abacatepay nao retornou um checkout de assinatura valido.",
      );
    }

    return body.data;
  }

  async listSubscriptionCheckouts(filters: {
    externalId?: string;
    id?: string;
    limit?: number;
  }): Promise<AbacatePaySubscriptionCheckoutListResponse> {
    const searchParams = new URLSearchParams();

    if (filters.externalId) {
      searchParams.set("externalId", filters.externalId);
    }

    if (filters.id) {
      searchParams.set("id", filters.id);
    }

    if (typeof filters.limit === "number") {
      searchParams.set("limit", String(filters.limit));
    }

    const response = await fetch(
      `${ABACATEPAY_API_BASE_URL}/subscriptions/list?${searchParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${env.server.abacatePayApiKey}`,
        },
        cache: "no-store",
      },
    );

    const body = (await response.json()) as AbacatePayApiResponse<
      AbacatePaySubscriptionCheckout[]
    >;

    if (!response.ok || !body.success || !Array.isArray(body.data)) {
      throw new Error(
        body.error || "A Abacatepay nao retornou a lista de checkouts de assinatura.",
      );
    }

    return {
      items: body.data,
    };
  }
}

export function createAbacatePayClient() {
  return new AbacatePayClient();
}

export function verifyAbacatePayWebhookSignature(
  rawBody: string,
  signatureFromHeader: string,
) {
  const expectedSignature = crypto
    .createHmac("sha256", env.server.abacatePayPublicKey)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signatureFromHeader);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function createPayloadHash(rawBody: string) {
  return crypto.createHash("sha256").update(rawBody, "utf8").digest("hex");
}
