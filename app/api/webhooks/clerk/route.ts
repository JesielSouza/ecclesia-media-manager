import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { env } from "@/lib/env";
import { createClerkSyncService } from "@/modules/clerk-sync/service";
import type { ClerkWebhookEvent } from "@/modules/clerk-sync/types";

function verifyWebhook(headers: Headers, payload: string): ClerkWebhookEvent {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing Svix verification headers.");
  }

  const webhook = new Webhook(env.clerkWebhookSecret);

  return webhook.verify(payload, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as ClerkWebhookEvent;
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const event = verifyWebhook(request.headers, payload);

    const clerkSyncService = createClerkSyncService();
    await clerkSyncService.handleEvent(event);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Clerk webhook sync failed.", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown webhook error.",
      },
      { status: 400 },
    );
  }
}
