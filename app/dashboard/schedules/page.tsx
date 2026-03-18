import Link from "next/link";
import {
  CalendarDays,
  CircleCheckBig,
  Clock3,
  MessageCircleMore,
  ShieldCheck,
  Users2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildScheduleWhatsAppUrl } from "@/modules/notifications/whatsapp";
import {
  createScheduleAction,
  deleteScheduleAction,
  updateScheduleAction,
} from "@/modules/schedules/server/actions";
import {
  type ScheduleRecord,
  type ScheduleStatus,
  getScheduleDashboardData,
} from "@/modules/schedules/server/repository";

export const dynamic = "force-dynamic";

const statusOptions: Array<{ label: string; value: ScheduleStatus }> = [
  { label: "Pendente", value: "pending" },
  { label: "Confirmada", value: "confirmed" },
  { label: "Recusada", value: "declined" },
];

const statusLabels: Record<ScheduleStatus, string> = {
  confirmed: "Confirmada",
  declined: "Recusada",
  pending: "Pendente",
};

function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatusTone(status: ScheduleStatus) {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-800";
    case "declined":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getSuggestedDateTime() {
  const now = new Date();
  const next = new Date(now);
  const dayOffset = (7 - now.getDay()) % 7 || 7;

  next.setDate(now.getDate() + dayOffset);
  next.setHours(18, 0, 0, 0);

  return toDateTimeLocalValue(next.toISOString());
}

function buildMetrics(schedules: ScheduleRecord[]) {
  const pending = schedules.filter((schedule) => schedule.status === "pending").length;
  const confirmed = schedules.filter(
    (schedule) => schedule.status === "confirmed",
  ).length;
  const uniqueVolunteers = new Set(schedules.map((schedule) => schedule.userId)).size;

  return [
    {
      description: "registros ativos nesta organizacao",
      icon: CalendarDays,
      title: "Escalas cadastradas",
      value: String(schedules.length),
    },
    {
      description: "voluntarios aguardando resposta",
      icon: Clock3,
      title: "Pendentes",
      value: String(pending),
    },
    {
      description: "confirmacoes ja registradas",
      icon: CircleCheckBig,
      title: "Confirmadas",
      value: String(confirmed),
    },
    {
      description: "pessoas alocadas nas escalas",
      icon: Users2,
      title: "Voluntarios",
      value: String(uniqueVolunteers),
    },
  ] as const;
}

function buildWhatsAppFollowUps(
  schedules: ScheduleRecord[],
  organizationName: string,
) {
  return schedules
    .filter(
      (schedule) =>
        schedule.status === "pending" || schedule.status === "declined",
    )
    .map((schedule) => ({
      schedule,
      url: buildScheduleWhatsAppUrl({
        member: schedule.member,
        organizationName,
        schedule,
      }),
    }))
    .filter((item): item is { schedule: ScheduleRecord; url: string } => item.url !== null);
}

type ScheduleFormProps = {
  canManageSchedules: boolean;
  editingSchedule?: ScheduleRecord;
  members: Awaited<ReturnType<typeof getScheduleDashboardData>>["members"];
};

function ScheduleForm({
  canManageSchedules,
  editingSchedule,
  members,
}: ScheduleFormProps) {
  const isEditing = Boolean(editingSchedule);
  const action = isEditing ? updateScheduleAction : createScheduleAction;

  return (
    <Card className="border-white/70 bg-white/90 shadow-soft">
      <CardHeader className="space-y-2">
        <CardTitle className="font-[family-name:var(--font-heading)] text-2xl">
          {isEditing ? "Editar escala" : "Nova escala"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribua os voluntarios por culto, horario e funcao mantendo o tenant
          isolado por organizacao.
        </p>
      </CardHeader>
      <CardContent>
        {canManageSchedules ? (
          <form action={action} className="space-y-5">
            {isEditing ? (
              <input type="hidden" name="scheduleId" value={editingSchedule?.id} />
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="eventDate">
                Data e horario
              </label>
              <input
                id="eventDate"
                name="eventDate"
                type="datetime-local"
                required
                defaultValue={
                  editingSchedule
                    ? toDateTimeLocalValue(editingSchedule.eventDate)
                    : getSuggestedDateTime()
                }
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="userId">
                Voluntario
              </label>
              <select
                id="userId"
                name="userId"
                required
                defaultValue={editingSchedule?.userId ?? ""}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>
                  Selecione um membro da organizacao
                </option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} · {member.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="roleName">
                Funcao ministerial
              </label>
              <input
                id="roleName"
                name="roleName"
                type="text"
                required
                maxLength={120}
                placeholder="Ex.: Operador de camera"
                defaultValue={editingSchedule?.roleName ?? ""}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="status">
                Status inicial
              </label>
              <select
                id="status"
                name="status"
                required
                defaultValue={editingSchedule?.status ?? "pending"}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {isEditing ? "Salvar alteracoes" : "Criar escala"}
              </button>
              {isEditing ? (
                <Link
                  href="/dashboard/schedules"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Cancelar edicao
                </Link>
              ) : null}
            </div>
          </form>
        ) : (
          <div className="rounded-[24px] border border-dashed border-border bg-background/80 p-5 text-sm text-muted-foreground">
            Seu contexto atual permite visualizar as escalas, mas apenas admins e
            leaders podem criar, editar ou remover registros.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SchedulesPageProps = {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    notice?: string;
  }>;
};

export default async function SchedulesPage({ searchParams }: SchedulesPageProps) {
  const [{ context, members, schedules }, params] = await Promise.all([
    getScheduleDashboardData(),
    searchParams,
  ]);
  const editingSchedule = params.edit
    ? schedules.find((schedule) => schedule.id === params.edit)
    : undefined;
  const metrics = buildMetrics(schedules);
  const whatsappFollowUps = buildWhatsAppFollowUps(
    schedules,
    context.organizationName,
  );

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-1 text-sm font-semibold text-foreground/80 shadow-sm">
            <ShieldCheck className="size-4 text-primary" />
            Tenant ativo: {context.organizationName}
          </span>
          <span className="rounded-full bg-secondary px-4 py-1 text-sm text-secondary-foreground">
            Papel atual: {context.actorProfileRole ?? "org:admin"}
          </span>
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          CRUD de escalas
        </h1>
        <p className="max-w-3xl text-lg text-muted-foreground">
          Cadastre cultos, edite alocacoes e acompanhe confirmacoes sem misturar dados
          entre igrejas. Todas as operacoes desta tela sao escopadas pela
          organizacao selecionada no Clerk.
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
        <ScheduleForm
          canManageSchedules={context.canManageSchedules}
          editingSchedule={editingSchedule}
          members={members}
        />

        <Card className="border-white/70 bg-white/90 shadow-soft">
          <CardHeader className="space-y-2">
            <CardTitle className="font-[family-name:var(--font-heading)] text-2xl">
              Escalas da organizacao
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Visualize tudo em ordem cronologica e ajuste os registros quando houver
              mudanca de equipe ou status.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {context.canManageSchedules ? (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-emerald-900">
                      Follow-up por WhatsApp
                    </p>
                    <p className="text-sm text-emerald-800/90">
                      {whatsappFollowUps.length > 0
                        ? `${whatsappFollowUps.length} escalas com contato rapido disponivel para pendencias ou recusas.`
                        : "Nenhuma escala pendente ou recusada com telefone valido para WhatsApp no momento."}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-900">
                    <MessageCircleMore className="size-4 text-emerald-700" />
                    Integracao simples ativa
                  </div>
                </div>
              </div>
            ) : null}

            {schedules.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border bg-background/80 p-6 text-sm text-muted-foreground">
                Nenhuma escala cadastrada ainda. Use o formulario ao lado para
                registrar o primeiro culto desta organizacao.
              </div>
            ) : (
              schedules.map((schedule) => (
                <article
                  key={schedule.id}
                  className="rounded-[24px] border border-border/70 bg-background/75 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-foreground">
                          {schedule.roleName}
                        </h2>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${formatStatusTone(schedule.status)}`}
                        >
                          {statusLabels[schedule.status]}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{formatEventDate(schedule.eventDate)}</p>
                        <p>
                          Voluntario:{" "}
                          <span className="font-medium text-foreground">
                            {schedule.member?.fullName ?? schedule.userId}
                          </span>
                        </p>
                        <p>
                          Perfil:{" "}
                          <span className="font-medium text-foreground">
                            {schedule.member?.role ?? "nao sincronizado"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {context.canManageSchedules ? (
                      <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                        {buildScheduleWhatsAppUrl({
                          member: schedule.member,
                          organizationName: context.organizationName,
                          schedule,
                        }) ? (
                          <a
                            href={
                              buildScheduleWhatsAppUrl({
                                member: schedule.member,
                                organizationName: context.organizationName,
                                schedule,
                              }) ?? "#"
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            WhatsApp
                          </a>
                        ) : null}
                        <Link
                          href={`/dashboard/schedules?edit=${schedule.id}`}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
                        >
                          Editar
                        </Link>
                        <form action={deleteScheduleAction}>
                          <input type="hidden" name="scheduleId" value={schedule.id} />
                          <button
                            type="submit"
                            className="inline-flex h-10 w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Excluir
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {context.canManageSchedules ? (
        <Card className="border-white/70 bg-white/90 shadow-soft">
          <CardHeader className="space-y-2">
            <CardTitle className="font-[family-name:var(--font-heading)] text-2xl">
              Acoes rapidas no WhatsApp
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Abra mensagens prontas para cobrar confirmacao ou tratar recusas sem
              sair do fluxo operacional.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {whatsappFollowUps.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                Para aparecer aqui, a escala precisa estar pendente ou recusada e o
                voluntario precisa ter telefone em formato valido.
              </div>
            ) : (
              whatsappFollowUps.map(({ schedule, url }) => (
                <div
                  key={schedule.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-border/70 bg-background/75 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {schedule.member?.fullName ?? schedule.userId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {schedule.roleName} · {formatEventDate(schedule.eventDate)}
                    </p>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    Abrir conversa
                  </a>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
