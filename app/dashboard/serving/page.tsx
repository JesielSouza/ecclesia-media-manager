import { CalendarClock, CheckCheck, CircleAlert, CircleX, RadioTower } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSetupState } from "@/modules/dashboard/components/dashboard-setup-state";
import {
  getDashboardSetupMessage,
  isDashboardSetupError,
} from "@/modules/dashboard/lib/setup-state";
import { updateOwnScheduleStatusAction } from "@/modules/schedules/server/actions";
import {
  type ScheduleStatus,
  type VolunteerScheduleRecord,
  getVolunteerServingData,
} from "@/modules/schedules/server/repository";

export const dynamic = "force-dynamic";

const statusLabels: Record<ScheduleStatus, string> = {
  confirmed: "Confirmada",
  declined: "Indisponivel",
  pending: "Aguardando resposta",
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatusTone(status: ScheduleStatus) {
  switch (status) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "declined":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

function buildMetrics(schedules: VolunteerScheduleRecord[]) {
  const upcoming = schedules.filter((schedule) => schedule.isUpcoming).length;
  const pending = schedules.filter((schedule) => schedule.status === "pending").length;
  const confirmed = schedules.filter((schedule) => schedule.status === "confirmed").length;

  return [
    {
      description: "escalas futuras no tenant ativo",
      icon: CalendarClock,
      title: "Proximas escalas",
      value: String(upcoming),
    },
    {
      description: "confirmacoes ainda pendentes",
      icon: CircleAlert,
      title: "Aguardando resposta",
      value: String(pending),
    },
    {
      description: "presencas ja confirmadas",
      icon: CheckCheck,
      title: "Confirmadas",
      value: String(confirmed),
    },
  ] as const;
}

function ScheduleResponseCard({ schedule }: { schedule: VolunteerScheduleRecord }) {
  const isLocked = schedule.isPast;

  return (
    <article className="rounded-[28px] border border-border/70 bg-white/95 p-5 shadow-soft">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Escala ministerial
            </p>
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
              {schedule.roleName}
            </h2>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${formatStatusTone(schedule.status)}`}
          >
            {statusLabels[schedule.status]}
          </span>
        </div>

        <div className="rounded-[24px] bg-secondary/65 p-4 text-sm text-secondary-foreground">
          <p className="font-semibold text-foreground">{formatEventDate(schedule.eventDate)}</p>
          <p className="mt-2 text-muted-foreground">
            Responda assim que possivel para a lideranca fechar a operacao do culto.
          </p>
        </div>

        {isLocked ? (
          <div className="rounded-[22px] border border-border/80 bg-background px-4 py-3 text-sm text-muted-foreground">
            Esta escala ficou somente para consulta porque o horario do evento ja passou.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <form action={updateOwnScheduleStatusAction}>
              <input type="hidden" name="scheduleId" value={schedule.id} />
              <input type="hidden" name="status" value="confirmed" />
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Confirmar presenca
              </button>
            </form>

            <form action={updateOwnScheduleStatusAction}>
              <input type="hidden" name="scheduleId" value={schedule.id} />
              <input type="hidden" name="status" value="declined" />
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Nao posso servir
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}

type ServingPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function ServingPage({ searchParams }: ServingPageProps) {
  const params = await searchParams;
  let context;
  let schedules;

  try {
    ({ context, schedules } = await getVolunteerServingData());
  } catch (error) {
    if (isDashboardSetupError(error)) {
      return (
        <DashboardSetupState
          title="Minha escala aguardando setup do tenant"
          errorMessage={getDashboardSetupMessage(error)}
        />
      );
    }

    throw error;
  }

  const metrics = buildMetrics(schedules);
  const upcomingSchedules = schedules.filter((schedule) => schedule.isUpcoming);
  const pastSchedules = schedules.filter((schedule) => schedule.isPast).reverse();

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-4 py-1 text-sm font-semibold text-foreground/80 shadow-sm">
          <RadioTower className="size-4 text-primary" />
          Operacao ativa em {context.organizationName}
        </div>
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          Minha escala
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          Interface mobile-first para o voluntario responder rapidamente se vai
          servir no proximo culto, sem perder o isolamento multi-tenant da
          organizacao ativa.
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

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map(({ description, icon: Icon, title, value }) => (
          <Card key={title} className="border-white/70 bg-white/90 shadow-soft">
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Proximas respostas</h2>
            <p className="text-sm text-muted-foreground">
              Cartoes otimizados para celular, com decisao rapida de confirmacao.
            </p>
          </div>

          {upcomingSchedules.length === 0 ? (
            <Card className="border-dashed border-border bg-background/85">
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhuma escala futura encontrada para o usuario ativo nesta organizacao.
              </CardContent>
            </Card>
          ) : (
            upcomingSchedules.map((schedule) => (
              <ScheduleResponseCard key={schedule.id} schedule={schedule} />
            ))
          )}
        </div>

        <Card className="border-white/70 bg-white/90 shadow-soft">
          <CardHeader className="space-y-2">
            <CardTitle className="font-[family-name:var(--font-heading)] text-2xl">
              Historico recente
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Escalas passadas ficam visiveis para consulta, mas sem permitir nova
              resposta.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {pastSchedules.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border bg-background/80 p-4 text-sm text-muted-foreground">
                Ainda nao existem escalas concluidas no historico deste voluntario.
              </div>
            ) : (
              pastSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-[22px] border border-border/70 bg-background/75 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{schedule.roleName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatEventDate(schedule.eventDate)}
                      </p>
                    </div>
                    <div
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${formatStatusTone(schedule.status)}`}
                    >
                      {schedule.status === "declined" ? (
                        <CircleX className="mr-1 size-3.5" />
                      ) : null}
                      {statusLabels[schedule.status]}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
