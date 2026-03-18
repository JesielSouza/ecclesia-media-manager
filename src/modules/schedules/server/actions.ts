"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createSchedule,
  deleteSchedule,
  updateSchedule,
} from "@/modules/schedules/server/repository";

const SCHEDULES_PATH = "/dashboard/schedules";

function buildRedirectUrl(messageType: "error" | "notice", message: string, edit?: string) {
  const searchParams = new URLSearchParams({
    [messageType]: message,
  });

  if (edit) {
    searchParams.set("edit", edit);
  }

  return `${SCHEDULES_PATH}?${searchParams.toString()}`;
}

export async function createScheduleAction(formData: FormData) {
  try {
    await createSchedule(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel criar a escala.";
    redirect(buildRedirectUrl("error", message) as never);
  }

  revalidatePath(SCHEDULES_PATH);
  redirect(buildRedirectUrl("notice", "Escala criada com sucesso.") as never);
}

export async function updateScheduleAction(formData: FormData) {
  const scheduleId =
    typeof formData.get("scheduleId") === "string"
      ? (formData.get("scheduleId") as string)
      : undefined;

  try {
    await updateSchedule(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel atualizar a escala.";
    redirect(buildRedirectUrl("error", message, scheduleId) as never);
  }

  revalidatePath(SCHEDULES_PATH);
  redirect(buildRedirectUrl("notice", "Escala atualizada com sucesso.") as never);
}

export async function deleteScheduleAction(formData: FormData) {
  try {
    await deleteSchedule(formData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nao foi possivel excluir a escala.";
    redirect(buildRedirectUrl("error", message) as never);
  }

  revalidatePath(SCHEDULES_PATH);
  redirect(buildRedirectUrl("notice", "Escala removida com sucesso.") as never);
}
