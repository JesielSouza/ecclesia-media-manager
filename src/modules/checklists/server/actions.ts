"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  completeChecklistTask,
  createChecklistTemplate,
  deleteChecklistTemplate,
  updateChecklistTemplate,
} from "@/modules/checklists/server/repository";

const CHECKLISTS_PATH = "/dashboard/checklists";

function buildRedirectUrl(
  messageType: "error" | "notice",
  message: string,
  edit?: string,
  category?: string,
) {
  const searchParams = new URLSearchParams({
    [messageType]: message,
  });

  if (edit) {
    searchParams.set("edit", edit);
  }

  if (category) {
    searchParams.set("category", category);
  }

  return `${CHECKLISTS_PATH}?${searchParams.toString()}`;
}

export async function createChecklistTemplateAction(formData: FormData) {
  try {
    await createChecklistTemplate(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel criar o item.";
    redirect(buildRedirectUrl("error", message) as never);
  }

  revalidatePath(CHECKLISTS_PATH);
  redirect(buildRedirectUrl("notice", "Item de checklist criado com sucesso.") as never);
}

export async function updateChecklistTemplateAction(formData: FormData) {
  const checklistId =
    typeof formData.get("checklistId") === "string"
      ? (formData.get("checklistId") as string)
      : undefined;
  const category =
    typeof formData.get("category") === "string"
      ? (formData.get("category") as string)
      : undefined;

  try {
    await updateChecklistTemplate(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel atualizar o item.";
    redirect(buildRedirectUrl("error", message, checklistId, category) as never);
  }

  revalidatePath(CHECKLISTS_PATH);
  redirect(buildRedirectUrl("notice", "Item de checklist atualizado com sucesso.") as never);
}

export async function deleteChecklistTemplateAction(formData: FormData) {
  try {
    await deleteChecklistTemplate(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel excluir o item.";
    redirect(buildRedirectUrl("error", message) as never);
  }

  revalidatePath(CHECKLISTS_PATH);
  redirect(buildRedirectUrl("notice", "Item de checklist removido com sucesso.") as never);
}

export async function completeChecklistTaskAction(formData: FormData) {
  const category =
    typeof formData.get("category") === "string"
      ? (formData.get("category") as string)
      : undefined;

  try {
    await completeChecklistTask(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel registrar a conclusao.";
    redirect(buildRedirectUrl("error", message, undefined, category) as never);
  }

  revalidatePath(CHECKLISTS_PATH);
  redirect(buildRedirectUrl("notice", "Checklist concluido com timestamp registrado.", undefined, category) as never);
}
