import type { ScheduleMember, ScheduleRecord, ScheduleStatus } from "@/modules/schedules/server/repository";

type WhatsAppMessageInput = {
  member: ScheduleMember | null;
  organizationName: string;
  schedule: ScheduleRecord;
};

function sanitizePhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/\D/g, "");
}

export function normalizeWhatsAppNumber(phoneNumber: string | null) {
  if (!phoneNumber) {
    return null;
  }

  const normalized = sanitizePhoneNumber(phoneNumber);

  if (normalized.length < 10 || normalized.length > 15) {
    return null;
  }

  return normalized;
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildGreeting(status: ScheduleStatus) {
  switch (status) {
    case "declined":
      return "Recebemos sua indisponibilidade";
    case "confirmed":
      return "Confirmacao recebida";
    default:
      return "Passando para confirmar sua escala";
  }
}

export function buildScheduleWhatsAppMessage({
  member,
  organizationName,
  schedule,
}: WhatsAppMessageInput) {
  const volunteerName = member?.fullName ?? "voluntario";
  const greeting = buildGreeting(schedule.status);

  const lines = [
    `Ola, ${volunteerName}. ${greeting} no Ecclesia Media Manager.`,
    "",
    `Organizacao: ${organizationName}`,
    `Funcao: ${schedule.roleName}`,
    `Culto: ${formatEventDate(schedule.eventDate)}`,
  ];

  if (schedule.status === "pending") {
    lines.push("", "Voce consegue confirmar sua participacao nesta escala?");
  }

  if (schedule.status === "declined") {
    lines.push("", "Consegue nos avisar se existe outra forma de apoiar ou se precisa de substituicao?");
  }

  if (schedule.status === "confirmed") {
    lines.push("", "Obrigado por confirmar. Qualquer ajuste de ultima hora, nos avise por aqui.");
  }

  return lines.join("\n");
}

export function buildScheduleWhatsAppUrl(input: WhatsAppMessageInput) {
  const normalizedPhone = normalizeWhatsAppNumber(input.member?.phoneNumber ?? null);

  if (!normalizedPhone) {
    return null;
  }

  const message = buildScheduleWhatsAppMessage(input);

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
