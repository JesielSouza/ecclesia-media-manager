import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  createPayloadHash,
  verifyAbacatePayWebhookSignature,
} from "@/modules/billing/abacatepay";
import { processAbacatePayWebhook } from "@/modules/billing/server/repository";
import type { BillingWebhookEventPayload } from "@/modules/billing/types";

function isAuthorizedWebhookRequest(request: Request) {
  const signature = request.headers.get("x-webhook-signature");
  const webhookSecret = new URL(request.url).searchParams.get("webhookSecret");

  return {
    signature,
    validSecret: webhookSecret === env.server.abacatePayWebhookSecret,
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const { signature, validSecret } = isAuthorizedWebhookRequest(request);

    if (!validSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!signature || !verifyAbacatePayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as BillingWebhookEventPayload;
    const result = await processAbacatePayWebhook({
      payload,
      payloadHash: createPayloadHash(rawBody),
    });

    return NextResponse.json({
      ok: true,
      deduplicated: result.deduplicated,
      ignored: "ignored" in result ? result.ignored : false,
      processingResult: "processingResult" in result ? result.processingResult : null,
    });
  } catch (error) {
    console.error("Abacatepay webhook processing failed.", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Abacatepay webhook error.",
      },
      { status: 500 },
    );
  }
}
