import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const entries = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    entries.push([key, value]);
  }

  return Object.fromEntries(entries);
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function printSection(title) {
  console.log(`\n${title}`);
}

function printCheck(label, ok, detail) {
  const prefix = ok ? "[ok]" : "[missing]";
  console.log(`${prefix} ${label}${detail ? `: ${detail}` : ""}`);
}

async function inspectSupabase(env) {
  if (
    !hasValue(env.NEXT_PUBLIC_SUPABASE_URL) ||
    !hasValue(env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    return;
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const [organizations, profiles, checkouts, webhooks] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("billing_checkouts").select("id", { count: "exact", head: true }),
    supabase.from("billing_webhook_events").select("id", { count: "exact", head: true }),
  ]);

  printSection("Supabase readiness");
  printCheck(
    "Organizations synced from Clerk",
    (organizations.count ?? 0) > 0,
    `${organizations.count ?? 0} row(s)`,
  );
  printCheck(
    "Profiles synced from Clerk",
    (profiles.count ?? 0) > 0,
    `${profiles.count ?? 0} row(s)`,
  );
  printCheck(
    "Billing checkouts recorded",
    (checkouts.count ?? 0) > 0,
    `${checkouts.count ?? 0} row(s)`,
  );
  printCheck(
    "Billing webhook events recorded",
    (webhooks.count ?? 0) > 0,
    `${webhooks.count ?? 0} row(s)`,
  );

  const errors = [organizations.error, profiles.error, checkouts.error, webhooks.error].filter(
    Boolean,
  );

  if (errors.length > 0) {
    console.log("\nSupabase query errors:");
    for (const error of errors) {
      console.log(`- ${error.message}`);
    }
  }
}

async function main() {
  const env = {
    ...readEnvFile(envPath),
    ...process.env,
  };

  const appEnvVars = [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_SUPABASE_JWT_TEMPLATE",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "CLERK_WEBHOOK_SECRET",
  ];
  const billingEnvVars = [
    "ABACATEPAY_API_KEY",
    "ABACATEPAY_PUBLIC_KEY",
    "ABACATEPAY_WEBHOOK_SECRET",
    "ABACATEPAY_PRO_PRODUCT_ID",
    "ABACATEPAY_PREMIUM_PRODUCT_ID",
  ];

  printSection("Core environment");
  for (const key of appEnvVars) {
    const isOptional = key === "CLERK_SUPABASE_JWT_TEMPLATE";
    printCheck(
      key,
      isOptional || hasValue(env[key]),
      hasValue(env[key]) ? "configured" : isOptional ? "optional (defaults to supabase)" : "required",
    );
  }

  printSection("Billing environment");
  for (const key of billingEnvVars) {
    printCheck(key, hasValue(env[key]), hasValue(env[key]) ? "configured" : "required");
  }

  await inspectSupabase(env);

  console.log("\nSuggested next step:");

  if (!hasValue(env.NEXT_PUBLIC_APP_URL)) {
    console.log("- Set NEXT_PUBLIC_APP_URL before testing checkout and webhook redirects.");
    return;
  }

  console.log("- If Supabase counts are zero, configure Clerk webhook delivery and create/select the first organization.");
  console.log("- For secure request-scoped access, configure the Clerk JWT template used by Supabase (default: supabase).");
}

main().catch((error) => {
  console.error("\nReadiness check failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
