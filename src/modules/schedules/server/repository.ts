import { createRequestScopedSupabaseClient } from "@/lib/supabase/request-scoped";
import { requireActiveSessionContext } from "@/modules/auth/server/session";

export type ScheduleStatus = "pending" | "confirmed" | "declined";
export type ProfileRole = "admin" | "leader" | "volunteer";

export type ScheduleMember = {
  fullName: string;
  id: string;
  phoneNumber: string | null;
  role: ProfileRole;
};

export type ScheduleRecord = {
  createdAt: string;
  eventDate: string;
  id: string;
  member: ScheduleMember | null;
  roleName: string;
  status: ScheduleStatus;
  userId: string;
};

export type ScheduleTenantContext = {
  actorProfileRole: ProfileRole | null;
  canManageSchedules: boolean;
  clerkOrgId: string;
  organizationId: string;
  organizationName: string;
  supabaseAccessToken: string | null;
  userId: string;
};

export type ScheduleDashboardData = {
  context: ScheduleTenantContext;
  members: ScheduleMember[];
  schedules: ScheduleRecord[];
};

export type VolunteerScheduleRecord = ScheduleRecord & {
  isPast: boolean;
  isUpcoming: boolean;
};

export type VolunteerServingData = {
  context: ScheduleTenantContext;
  schedules: VolunteerScheduleRecord[];
};

type OrganizationRow = {
  id: string;
  name: string;
};

type ProfileRow = {
  full_name: string;
  id: string;
  phone_number: string | null;
  role: ProfileRole;
};

type ScheduleRow = {
  created_at: string;
  event_date: string;
  id: string;
  role_name: string;
  status: ScheduleStatus;
  user_id: string;
};

type ScheduleInput = {
  eventDate: string;
  roleName: string;
  status: ScheduleStatus;
  userId: string;
};

const SCHEDULE_STATUSES = ["pending", "confirmed", "declined"] as const;
const VOLUNTEER_RESPONSE_STATUSES: ScheduleStatus[] = ["confirmed", "declined"];
const MANAGER_ROLES: ProfileRole[] = ["admin", "leader"];

function getSupabase(params: {
  accessToken?: string | null;
  clerkOrgId: string;
  organizationId?: string | null;
  userId: string;
}) {
  return createRequestScopedSupabaseClient(params);
}

function isScheduleStatus(value: string): value is ScheduleStatus {
  return (SCHEDULE_STATUSES as readonly string[]).includes(value);
}

function isVolunteerResponseStatus(value: string): value is ScheduleStatus {
  return VOLUNTEER_RESPONSE_STATUSES.includes(value as ScheduleStatus);
}

function formatSupabaseError(message: string, error: { message: string }) {
  if (error.message.includes("schedules_org_user_unique")) {
    return "Ja existe uma escala igual para esse voluntario, horario e funcao.";
  }

  return `${message} ${error.message}`;
}

function parseScheduleInput(formData: FormData): ScheduleInput {
  const eventDateValue = formData.get("eventDate");
  const userIdValue = formData.get("userId");
  const roleNameValue = formData.get("roleName");
  const statusValue = formData.get("status");

  if (
    typeof eventDateValue !== "string" ||
    typeof userIdValue !== "string" ||
    typeof roleNameValue !== "string" ||
    typeof statusValue !== "string"
  ) {
    throw new Error("Formulario de escala incompleto.");
  }

  const eventDate = new Date(eventDateValue);

  if (Number.isNaN(eventDate.getTime())) {
    throw new Error("Data e horario da escala invalidos.");
  }

  const roleName = roleNameValue.trim();

  if (!roleName) {
    throw new Error("Informe a funcao ministerial da escala.");
  }

  if (!isScheduleStatus(statusValue)) {
    throw new Error("Status da escala invalido.");
  }

  const userId = userIdValue.trim();

  if (!userId) {
    throw new Error("Selecione um voluntario para a escala.");
  }

  return {
    eventDate: eventDate.toISOString(),
    roleName,
    status: statusValue,
    userId,
  };
}

async function resolveOrganization(params: {
  accessToken?: string | null;
  clerkOrgId: string;
  userId: string;
}): Promise<OrganizationRow> {
  const supabase = getSupabase(params);
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("clerk_org_id", params.clerkOrgId)
    .maybeSingle<OrganizationRow>();

  if (error) {
    throw new Error(`Falha ao carregar a organizacao ativa. ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "A organizacao ativa do Clerk ainda nao foi sincronizada com o Supabase.",
    );
  }

  return data;
}

async function resolveActorProfile(
  clerkOrgId: string,
  organizationId: string,
  accessToken: string | null,
  userId: string,
): Promise<ProfileRole | null> {
  const supabase = getSupabase({
    accessToken,
    clerkOrgId,
    organizationId,
    userId,
  });
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("org_id", organizationId)
    .eq("id", userId)
    .maybeSingle<{ role: ProfileRole }>();

  if (error) {
    throw new Error(`Falha ao validar o perfil ativo. ${error.message}`);
  }

  return data?.role ?? null;
}

export async function resolveScheduleTenantContext(): Promise<ScheduleTenantContext> {
  const session = await requireActiveSessionContext("/dashboard/schedules");
  const organization = await resolveOrganization({
    accessToken: session.supabaseAccessToken,
    clerkOrgId: session.orgId,
    userId: session.userId,
  });
  const actorProfileRole = await resolveActorProfile(
    session.orgId,
    organization.id,
    session.supabaseAccessToken,
    session.userId,
  );
  const canManageSchedules =
    session.orgRole === "org:admin" ||
    (actorProfileRole !== null && MANAGER_ROLES.includes(actorProfileRole));

  return {
    actorProfileRole,
    canManageSchedules,
    clerkOrgId: session.orgId,
    organizationId: organization.id,
    organizationName: organization.name,
    supabaseAccessToken: session.supabaseAccessToken,
    userId: session.userId,
  };
}

export async function getScheduleDashboardData(): Promise<ScheduleDashboardData> {
  const context = await resolveScheduleTenantContext();
  const supabase = getSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: context.organizationId,
    userId: context.userId,
  });

  const [{ data: members, error: membersError }, { data: schedules, error: schedulesError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, role, phone_number")
        .eq("org_id", context.organizationId)
        .order("full_name", { ascending: true })
        .returns<ProfileRow[]>(),
      supabase
        .from("schedules")
        .select("id, event_date, user_id, role_name, status, created_at")
        .eq("org_id", context.organizationId)
        .order("event_date", { ascending: true })
        .returns<ScheduleRow[]>(),
    ]);

  if (membersError) {
    throw new Error(`Falha ao carregar os voluntarios. ${membersError.message}`);
  }

  if (schedulesError) {
    throw new Error(`Falha ao carregar as escalas. ${schedulesError.message}`);
  }

  const memberById = new Map(
    (members ?? []).map((member) => [
      member.id,
      {
        fullName: member.full_name,
        id: member.id,
        phoneNumber: member.phone_number,
        role: member.role,
      } satisfies ScheduleMember,
    ]),
  );

  return {
    context,
    members: (members ?? []).map((member) => ({
      fullName: member.full_name,
      id: member.id,
      phoneNumber: member.phone_number,
      role: member.role,
    })),
    schedules: (schedules ?? []).map((schedule) => ({
      createdAt: schedule.created_at,
      eventDate: schedule.event_date,
      id: schedule.id,
      member: memberById.get(schedule.user_id) ?? null,
      roleName: schedule.role_name,
      status: schedule.status,
      userId: schedule.user_id,
    })),
  };
}

export async function getVolunteerServingData(): Promise<VolunteerServingData> {
  const context = await resolveScheduleTenantContext();
  const supabase = getSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: context.organizationId,
    userId: context.userId,
  });

  const { data, error } = await supabase
    .from("schedules")
    .select("id, event_date, user_id, role_name, status, created_at")
    .eq("org_id", context.organizationId)
    .eq("user_id", context.userId)
    .order("event_date", { ascending: true })
    .returns<ScheduleRow[]>();

  if (error) {
    throw new Error(`Falha ao carregar suas escalas. ${error.message}`);
  }

  const now = Date.now();

  return {
    context,
    schedules: (data ?? []).map((schedule) => {
      const eventDateTime = new Date(schedule.event_date).getTime();

      return {
        createdAt: schedule.created_at,
        eventDate: schedule.event_date,
        id: schedule.id,
        isPast: eventDateTime < now,
        isUpcoming: eventDateTime >= now,
        member: null,
        roleName: schedule.role_name,
        status: schedule.status,
        userId: schedule.user_id,
      };
    }),
  };
}

async function ensureMemberBelongsToOrganization(
  accessToken: string | null,
  clerkOrgId: string,
  organizationId: string,
  actorUserId: string,
  targetUserId: string,
): Promise<void> {
  const supabase = getSupabase({
    accessToken,
    clerkOrgId,
    organizationId,
    userId: actorUserId,
  });
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("org_id", organizationId)
    .eq("id", targetUserId)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(`Falha ao validar o voluntario. ${error.message}`);
  }

  if (!data) {
    throw new Error("O voluntario selecionado nao pertence a organizacao ativa.");
  }
}

async function assertScheduleManagerAccess() {
  const context = await resolveScheduleTenantContext();

  if (!context.canManageSchedules) {
    throw new Error(
      "Apenas admins e leaders da organizacao podem gerenciar escalas.",
    );
  }

  return context;
}

export async function createSchedule(formData: FormData): Promise<void> {
  const context = await assertScheduleManagerAccess();
  const input = parseScheduleInput(formData);
  const supabase = getSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: context.organizationId,
    userId: context.userId,
  });

  await ensureMemberBelongsToOrganization(
    context.supabaseAccessToken,
    context.clerkOrgId,
    context.organizationId,
    context.userId,
    input.userId,
  );

  const { error } = await supabase.from("schedules").insert({
    event_date: input.eventDate,
    org_id: context.organizationId,
    role_name: input.roleName,
    status: input.status,
    user_id: input.userId,
  });

  if (error) {
    throw new Error(formatSupabaseError("Falha ao criar a escala.", error));
  }
}

export async function updateSchedule(formData: FormData): Promise<void> {
  const context = await assertScheduleManagerAccess();
  const scheduleIdValue = formData.get("scheduleId");

  if (typeof scheduleIdValue !== "string" || !scheduleIdValue.trim()) {
    throw new Error("Escala alvo nao informada para atualizacao.");
  }

  const input = parseScheduleInput(formData);
  const supabase = getSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: context.organizationId,
    userId: context.userId,
  });

  await ensureMemberBelongsToOrganization(
    context.supabaseAccessToken,
    context.clerkOrgId,
    context.organizationId,
    context.userId,
    input.userId,
  );

  const { error } = await supabase
    .from("schedules")
    .update({
      event_date: input.eventDate,
      role_name: input.roleName,
      status: input.status,
      user_id: input.userId,
    })
    .eq("org_id", context.organizationId)
    .eq("id", scheduleIdValue.trim());

  if (error) {
    throw new Error(formatSupabaseError("Falha ao atualizar a escala.", error));
  }
}

export async function deleteSchedule(formData: FormData): Promise<void> {
  const context = await assertScheduleManagerAccess();
  const scheduleIdValue = formData.get("scheduleId");

  if (typeof scheduleIdValue !== "string" || !scheduleIdValue.trim()) {
    throw new Error("Escala alvo nao informada para exclusao.");
  }

  const supabase = getSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: context.organizationId,
    userId: context.userId,
  });
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("org_id", context.organizationId)
    .eq("id", scheduleIdValue.trim());

  if (error) {
    throw new Error(`Falha ao excluir a escala. ${error.message}`);
  }
}

export async function updateOwnScheduleStatus(formData: FormData): Promise<void> {
  const context = await resolveScheduleTenantContext();
  const scheduleIdValue = formData.get("scheduleId");
  const statusValue = formData.get("status");

  if (typeof scheduleIdValue !== "string" || !scheduleIdValue.trim()) {
    throw new Error("Escala alvo nao informada para confirmacao.");
  }

  if (typeof statusValue !== "string" || !isVolunteerResponseStatus(statusValue)) {
    throw new Error("Resposta de confirmacao invalida.");
  }

  const scheduleId = scheduleIdValue.trim();
  const supabase = getSupabase({
    accessToken: context.supabaseAccessToken,
    clerkOrgId: context.clerkOrgId,
    organizationId: context.organizationId,
    userId: context.userId,
  });
  const { data: schedule, error: scheduleError } = await supabase
    .from("schedules")
    .select("id, event_date, status")
    .eq("org_id", context.organizationId)
    .eq("id", scheduleId)
    .eq("user_id", context.userId)
    .maybeSingle<{ event_date: string; id: string; status: ScheduleStatus }>();

  if (scheduleError) {
    throw new Error(`Falha ao validar sua escala. ${scheduleError.message}`);
  }

  if (!schedule) {
    throw new Error("Essa escala nao pertence ao usuario ativo ou nao existe.");
  }

  if (new Date(schedule.event_date).getTime() < Date.now()) {
    throw new Error("Nao e possivel responder escalas de eventos que ja aconteceram.");
  }

  const { error } = await supabase
    .from("schedules")
    .update({
      status: statusValue,
    })
    .eq("org_id", context.organizationId)
    .eq("id", scheduleId)
    .eq("user_id", context.userId);

  if (error) {
    throw new Error(`Falha ao atualizar sua confirmacao. ${error.message}`);
  }
}
