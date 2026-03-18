"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  createSubscriptionCheckout,
  refreshCheckoutStatusById,
  refreshLatestCheckoutStatus,
} from "@/modules/billing/server/repository";
import type { ManagedPlanType } from "@/modules/billing/types";

const BILLING_PATH = "/dashboard/billing";

function buildRedirectUrl(messageType: "error" | "notice", message: string) {
  return `${BILLING_PATH}?${new URLSearchParams({ [messageType]: message }).toString()}`;
}

export async function startSubscriptionCheckoutAction(formData: FormData) {
  const planType = formData.get("planType");

  if (planType !== "pro" && planType !== "premium") {
    redirect(
      buildRedirectUrl("error", "Plano invalido para checkout de assinatura.") as never,
    );
  }

  try {
    const checkoutUrl = await createSubscriptionCheckout(planType as ManagedPlanType);
    revalidatePath(BILLING_PATH);
    redirect(checkoutUrl as never);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel iniciar o checkout da assinatura.";
    redirect(buildRedirectUrl("error", message) as never);
  }
}

export async function refreshLatestCheckoutStatusAction() {
  try {
    const status = await refreshLatestCheckoutStatus();
    revalidatePath(BILLING_PATH);
    redirect(
      buildRedirectUrl(
        "notice",
        `Ultimo checkout sincronizado com a Abacatepay. Status atual: ${status}.`,
      ) as never,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel sincronizar o ultimo checkout.";
    redirect(buildRedirectUrl("error", message) as never);
  }
}

export async function refreshCheckoutStatusByIdAction(formData: FormData) {
  const checkoutId = formData.get("checkoutId");

  if (typeof checkoutId !== "string" || !checkoutId.trim()) {
    redirect(buildRedirectUrl("error", "Checkout alvo nao informado para sincronizacao.") as never);
  }

  try {
    const result = await refreshCheckoutStatusById(checkoutId.trim());
    revalidatePath(BILLING_PATH);
    redirect(
      buildRedirectUrl(
        "notice",
        `Checkout ${result.externalId} sincronizado com sucesso. Status atual: ${result.status}.`,
      ) as never,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel sincronizar o checkout selecionado.";
    redirect(buildRedirectUrl("error", message) as never);
  }
}
