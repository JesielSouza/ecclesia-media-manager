import Link from "next/link";
import {
  CheckCheck,
  ClipboardList,
  LockKeyhole,
  Siren,
  TimerReset,
  UserRoundCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSetupState } from "@/modules/dashboard/components/dashboard-setup-state";
import {
  getDashboardSetupMessage,
  isDashboardSetupError,
} from "@/modules/dashboard/lib/setup-state";
import {
  completeChecklistTaskAction,
  createChecklistTemplateAction,
  deleteChecklistTemplateAction,
  updateChecklistTemplateAction,
} from "@/modules/checklists/server/actions";
import {
  type ChecklistCategory,
  type ChecklistTemplateWithLogs,
  getChecklistDashboardData,
} from "@/modules/checklists/server/repository";

export const dynamic = "force-dynamic";

const categoryLabels: Record<ChecklistCategory, string> = {
  "pos-culto": "Pos-culto",
  "pre-culto": "Pre-culto",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildMetrics(templates: ChecklistTemplateWithLogs[]) {
  const mandatory = templates.filter((template) => template.isMandatory).length;
  const completed = templates.filter((template) => template.latestLog !== null).length;
  const pending = templates.length - completed;

  return [
    {
      description: "rotinas operacionais catalogadas",
      icon: ClipboardList,
      title: "Templates",
      value: String(templates.length),
    },
    {
      description: "tarefas que exigem atencao obrigatoria",
      icon: Siren,
      title: "Obrigatorias",
      value: String(mandatory),
    },
    {
      description: "itens ja executados recentemente",
      icon: CheckCheck,
      title: "Com log",
      value: String(completed),
    },
    {
      description: "itens sem registro recente",
      icon: TimerReset,
      title: "Sem log",
      value: String(pending),
    },
  ] as const;
}

type ChecklistTemplateFormProps = {
  editingTemplate?: ChecklistTemplateWithLogs;
  canManageChecklists: boolean;
};

function ChecklistTemplateForm({
  canManageChecklists,
  editingTemplate,
}: ChecklistTemplateFormProps) {
  const isEditing = Boolean(editingTemplate);
  const action = isEditing
    ? updateChecklistTemplateAction
    : createChecklistTemplateAction;

  return (
    <Card className="border-white/70 bg-white/90 shadow-soft">
      <CardHeader className="space-y-2">
        <CardTitle className="font-[family-name:var(--font-heading)] text-2xl">
          {isEditing ? "Editar template" : "Novo template"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Defina os passos operacionais da equipe por categoria e marque se o item
          e obrigatorio para o culto.
        </p>
      </CardHeader>
      <CardContent>
        {canManageChecklists ? (
          <form action={action} className="space-y-5">
            {isEditing ? (
              <input type="hidden" name="checklistId" value={editingTemplate?.id} />
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="taskName">
                Nome da tarefa
              </label>
              <input
                id="taskName"
                name="taskName"
                type="text"
                required
                maxLength={160}
                defaultValue={editingTemplate?.taskName ?? ""}
                placeholder="Ex.: Testar retorno do palco"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="category">
                Categoria
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue={editingTemplate?.category ?? "pre-culto"}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="pre-culto">Pre-culto</option>
                <option value="pos-culto">Pos-culto</option>
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-foreground">
              <input
                type="checkbox"
                name="isMandatory"
                defaultChecked={editingTemplate?.isMandatory ?? false}
                className="size-4 rounded border-input"
              />
              Marcar como tarefa obrigatoria
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {isEditing ? "Salvar alteracoes" : "Criar template"}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground">
            Apenas admins e leaders podem alterar os templates. O time ainda pode
            executar os itens e registrar timestamps normalmente.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistExecutionCard({
  category,
  templates,
}: {
  category: ChecklistCategory;
  templates: ChecklistTemplateWithLogs[];
}) {
  return (
    <Card className="border-white/70 bg-white/90 shadow-soft">
      <CardHeader className="space-y-2">
        <CardTitle className="font-[family-name:var(--font-heading)] text-2xl">
          {categoryLabels[category]}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Marque a execucao dos passos e grave o timestamp de conclusao para a equipe.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
            Nenhum item cadastrado nesta categoria ainda.
          </div>
        ) : (
          templates.map((template) => (
            <article
              key={template.id}
              className="rounded-[24px] border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{template.taskName}</p>
                      {template.isMandatory ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                          Obrigatoria
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.latestLog
                        ? `Ultimo registro em ${formatDateTime(template.latestLog.completedAt)} por ${template.latestLog.userId}.`
                        : "Ainda sem registro de execucao."}
                    </p>
                  </div>

                  <form action={completeChecklistTaskAction}>
                    <input type="hidden" name="checklistId" value={template.id} />
                    <input type="hidden" name="category" value={template.category} />
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Concluir agora
                    </button>
                  </form>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{template.completionCount} logs registrados</span>
                  <span>Criado em {formatDateTime(template.createdAt)}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}

type ChecklistsPageProps = {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    notice?: string;
  }>;
};

export default async function ChecklistsPage({ searchParams }: ChecklistsPageProps) {
  const params = await searchParams;
  let context;
  let categories;
  let groupedTemplates;
  let templates;

  try {
    ({ context, categories, groupedTemplates, templates } =
      await getChecklistDashboardData());
  } catch (error) {
    if (isDashboardSetupError(error)) {
      return (
        <DashboardSetupState
          title="Checklists aguardando setup do tenant"
          errorMessage={getDashboardSetupMessage(error)}
        />
      );
    }

    throw error;
  }

  const editingTemplate = params.edit
    ? templates.find((template) => template.id === params.edit)
    : undefined;
  const metrics = buildMetrics(templates);

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-1 text-sm font-semibold text-foreground/80 shadow-sm">
            <UserRoundCheck className="size-4 text-primary" />
            Operacao do tenant: {context.organizationName}
          </span>
          <span className="rounded-full bg-secondary px-4 py-1 text-sm text-secondary-foreground">
            Papel atual: {context.actorProfileRole ?? "org:admin"}
          </span>
          {!context.canManageSchedules ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-1 text-sm text-muted-foreground">
              <LockKeyhole className="size-4" />
              Modo execucao
            </span>
          ) : null}
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          Checklist interativo
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Centralize o pre-culto e o pos-culto com templates por organizacao e
          logs de conclusao com timestamp para rastreabilidade operacional.
        </p>
      </div>

      {params.notice ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
          {params.notice}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-800">
          {params.error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        {metrics.map(({ description, icon: Icon, title, value }) => (
          <Card key={title} className="border-white/70 bg-white/85 shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{title}</CardTitle>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
        <ChecklistTemplateForm
          canManageChecklists={context.canManageSchedules}
          editingTemplate={editingTemplate}
        />

        <div className="space-y-6">
          {categories.map((category) => (
            <ChecklistExecutionCard
              key={category}
              category={category}
              templates={groupedTemplates[category]}
            />
          ))}
        </div>
      </div>

      {context.canManageSchedules ? (
        <Card className="border-white/70 bg-white/90 shadow-soft">
          <CardHeader className="space-y-2">
            <CardTitle className="font-[family-name:var(--font-heading)] text-2xl">
              Gerenciar templates
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ajuste a biblioteca operacional sem sair da mesma tela de execucao.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {templates.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border bg-background/80 p-6 text-sm text-muted-foreground">
                Nenhum template cadastrado ainda. Crie o primeiro item para iniciar o
                checklist operacional da organizacao.
              </div>
            ) : (
              templates.map((template) => (
                <article
                  key={template.id}
                  className="rounded-[24px] border border-border/70 bg-background/75 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-foreground">
                          {template.taskName}
                        </h2>
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground">
                          {categoryLabels[template.category]}
                        </span>
                        {template.isMandatory ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                            Obrigatoria
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Criado em {formatDateTime(template.createdAt)}</p>
                        <p>
                          Ultimo log:{" "}
                          <span className="font-medium text-foreground">
                            {template.latestLog
                              ? `${formatDateTime(template.latestLog.completedAt)} por ${template.latestLog.userId}`
                              : "nenhum registro ainda"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                      <Link
                        href={`/dashboard/checklists?edit=${template.id}`}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                      >
                        Editar
                      </Link>
                      <form action={deleteChecklistTemplateAction}>
                        <input type="hidden" name="checklistId" value={template.id} />
                        <button
                          type="submit"
                          className="inline-flex h-10 w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
