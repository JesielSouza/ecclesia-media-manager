import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  resolveScheduleTenantContext,
} from "@/modules/schedules/server/repository";

export type ChecklistCategory = "pre-culto" | "pos-culto";

export type ChecklistTemplate = {
  category: ChecklistCategory;
  createdAt: string;
  id: string;
  isMandatory: boolean;
  taskName: string;
  updatedAt: string;
};

export type ChecklistLogRecord = {
  checklistId: string;
  completedAt: string;
  id: string;
  status: "done";
  userId: string;
};

export type ChecklistTemplateWithLogs = ChecklistTemplate & {
  completionCount: number;
  latestLog: ChecklistLogRecord | null;
};

export type ChecklistDashboardData = {
  categories: ChecklistCategory[];
  context: Awaited<ReturnType<typeof resolveScheduleTenantContext>>;
  groupedTemplates: Record<ChecklistCategory, ChecklistTemplateWithLogs[]>;
  logsByChecklistId: Map<string, ChecklistLogRecord[]>;
  templates: ChecklistTemplateWithLogs[];
};

type ChecklistRow = {
  category: ChecklistCategory;
  created_at: string;
  id: string;
  is_mandatory: boolean;
  task_name: string;
  updated_at: string;
};

type ChecklistLogRow = {
  checklist_id: string;
  completed_at: string;
  id: string;
  status: "done";
  user_id: string;
};

const CHECKLIST_CATEGORIES: ChecklistCategory[] = ["pre-culto", "pos-culto"];

function getSupabase() {
  return createSupabaseAdminClient();
}

function isChecklistCategory(value: string): value is ChecklistCategory {
  return CHECKLIST_CATEGORIES.includes(value as ChecklistCategory);
}

function formatChecklistError(message: string, error: { message: string }) {
  if (error.message.includes("checklists_org_task_category_unique")) {
    return "Ja existe um item com esse nome na categoria selecionada.";
  }

  return `${message} ${error.message}`;
}

function parseChecklistTemplateInput(formData: FormData) {
  const taskNameValue = formData.get("taskName");
  const categoryValue = formData.get("category");
  const isMandatory = formData.get("isMandatory") === "on";

  if (typeof taskNameValue !== "string" || typeof categoryValue !== "string") {
    throw new Error("Formulario de checklist incompleto.");
  }

  const taskName = taskNameValue.trim();

  if (!taskName) {
    throw new Error("Informe o nome da tarefa operacional.");
  }

  if (!isChecklistCategory(categoryValue)) {
    throw new Error("Categoria de checklist invalida.");
  }

  return {
    category: categoryValue,
    isMandatory,
    taskName,
  };
}

async function assertChecklistManagerAccess() {
  const context = await resolveScheduleTenantContext();

  if (!context.canManageSchedules) {
    throw new Error("Apenas admins e leaders podem gerenciar os templates do checklist.");
  }

  return context;
}

export async function getChecklistDashboardData(): Promise<ChecklistDashboardData> {
  const context = await resolveScheduleTenantContext();
  const supabase = getSupabase();

  const [{ data: templates, error: templatesError }, { data: logs, error: logsError }] =
    await Promise.all([
      supabase
        .from("checklists")
        .select("id, task_name, category, is_mandatory, created_at, updated_at")
        .eq("org_id", context.organizationId)
        .order("category", { ascending: true })
        .order("task_name", { ascending: true })
        .returns<ChecklistRow[]>(),
      supabase
        .from("checklist_logs")
        .select("id, checklist_id, user_id, status, completed_at")
        .eq("org_id", context.organizationId)
        .order("completed_at", { ascending: false })
        .returns<ChecklistLogRow[]>(),
    ]);

  if (templatesError) {
    throw new Error(`Falha ao carregar os templates de checklist. ${templatesError.message}`);
  }

  if (logsError) {
    throw new Error(`Falha ao carregar os logs de checklist. ${logsError.message}`);
  }

  const logsByChecklistId = new Map<string, ChecklistLogRecord[]>();

  for (const log of logs ?? []) {
    const current = logsByChecklistId.get(log.checklist_id) ?? [];
    current.push({
      checklistId: log.checklist_id,
      completedAt: log.completed_at,
      id: log.id,
      status: log.status,
      userId: log.user_id,
    });
    logsByChecklistId.set(log.checklist_id, current);
  }

  const normalizedTemplates = (templates ?? []).map((template) => {
    const templateLogs = logsByChecklistId.get(template.id) ?? [];

    return {
      category: template.category,
      completionCount: templateLogs.length,
      createdAt: template.created_at,
      id: template.id,
      isMandatory: template.is_mandatory,
      latestLog: templateLogs[0] ?? null,
      taskName: template.task_name,
      updatedAt: template.updated_at,
    } satisfies ChecklistTemplateWithLogs;
  });

  return {
    categories: CHECKLIST_CATEGORIES,
    context,
    groupedTemplates: {
      "pos-culto": normalizedTemplates.filter((item) => item.category === "pos-culto"),
      "pre-culto": normalizedTemplates.filter((item) => item.category === "pre-culto"),
    },
    logsByChecklistId,
    templates: normalizedTemplates,
  };
}

export async function createChecklistTemplate(formData: FormData): Promise<void> {
  const context = await assertChecklistManagerAccess();
  const input = parseChecklistTemplateInput(formData);
  const supabase = getSupabase();

  const { error } = await supabase.from("checklists").insert({
    category: input.category,
    is_mandatory: input.isMandatory,
    org_id: context.organizationId,
    task_name: input.taskName,
  });

  if (error) {
    throw new Error(formatChecklistError("Falha ao criar o item do checklist.", error));
  }
}

export async function updateChecklistTemplate(formData: FormData): Promise<void> {
  const context = await assertChecklistManagerAccess();
  const checklistIdValue = formData.get("checklistId");

  if (typeof checklistIdValue !== "string" || !checklistIdValue.trim()) {
    throw new Error("Item alvo nao informado para atualizacao.");
  }

  const input = parseChecklistTemplateInput(formData);
  const supabase = getSupabase();

  const { error } = await supabase
    .from("checklists")
    .update({
      category: input.category,
      is_mandatory: input.isMandatory,
      task_name: input.taskName,
    })
    .eq("org_id", context.organizationId)
    .eq("id", checklistIdValue.trim());

  if (error) {
    throw new Error(formatChecklistError("Falha ao atualizar o item do checklist.", error));
  }
}

export async function deleteChecklistTemplate(formData: FormData): Promise<void> {
  const context = await assertChecklistManagerAccess();
  const checklistIdValue = formData.get("checklistId");

  if (typeof checklistIdValue !== "string" || !checklistIdValue.trim()) {
    throw new Error("Item alvo nao informado para exclusao.");
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from("checklists")
    .delete()
    .eq("org_id", context.organizationId)
    .eq("id", checklistIdValue.trim());

  if (error) {
    throw new Error(`Falha ao excluir o item do checklist. ${error.message}`);
  }
}

export async function completeChecklistTask(formData: FormData): Promise<void> {
  const context = await resolveScheduleTenantContext();
  const checklistIdValue = formData.get("checklistId");

  if (typeof checklistIdValue !== "string" || !checklistIdValue.trim()) {
    throw new Error("Item alvo nao informado para conclusao.");
  }

  const checklistId = checklistIdValue.trim();
  const supabase = getSupabase();
  const { data: checklist, error: checklistError } = await supabase
    .from("checklists")
    .select("id")
    .eq("org_id", context.organizationId)
    .eq("id", checklistId)
    .maybeSingle<{ id: string }>();

  if (checklistError) {
    throw new Error(`Falha ao validar o item do checklist. ${checklistError.message}`);
  }

  if (!checklist) {
    throw new Error("Esse item nao pertence a organizacao ativa ou nao existe.");
  }

  const { error } = await supabase.from("checklist_logs").insert({
    checklist_id: checklistId,
    org_id: context.organizationId,
    status: "done",
    user_id: context.userId,
  });

  if (error) {
    throw new Error(`Falha ao registrar a conclusao do checklist. ${error.message}`);
  }
}
