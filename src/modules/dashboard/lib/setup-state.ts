export function isDashboardSetupError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("a organizacao ativa do clerk ainda nao foi sincronizada") ||
    message.includes("falha ao carregar a organizacao ativa")
  );
}

export function getDashboardSetupMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "O dashboard ainda nao conseguiu validar a infraestrutura inicial deste tenant.";
}
