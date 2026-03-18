import fs from "node:fs";
import path from "node:path";

import { createClerkClient } from "@clerk/backend";
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

    entries.push([
      line.slice(0, separatorIndex).trim(),
      line.slice(separatorIndex + 1).trim(),
    ]);
  }

  return Object.fromEntries(entries);
}

function requireEnv(env, key) {
  const value = env[key];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function buildFullName(input) {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();

  if (name) {
    return name;
  }

  if (input.username) {
    return input.username;
  }

  if (input.fallbackIdentifier) {
    return input.fallbackIdentifier;
  }

  return input.userId;
}

function extractPhoneNumber(identifier) {
  if (!identifier) {
    return null;
  }

  return identifier.startsWith("+") ? identifier : null;
}

function readStringMetadata(metadata, key) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function resolvePlanType(organization) {
  const metadataPlan =
    readStringMetadata(organization.privateMetadata, "plan_type") ??
    readStringMetadata(organization.publicMetadata, "plan_type");

  if (metadataPlan === "pro" || metadataPlan === "premium") {
    return metadataPlan;
  }

  return "basic";
}

function mapMembershipRole(clerkRole, metadata) {
  const explicitRole = readStringMetadata(metadata, "role");

  if (
    explicitRole === "admin" ||
    explicitRole === "leader" ||
    explicitRole === "volunteer"
  ) {
    return explicitRole;
  }

  if (clerkRole === "org:admin") {
    return "admin";
  }

  return "volunteer";
}

async function fetchAllPages(fetchPage) {
  const items = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const page = await fetchPage({ limit, offset });
    const currentItems = Array.isArray(page?.data) ? page.data : Array.isArray(page) ? page : [];

    items.push(...currentItems);

    if (currentItems.length < limit) {
      break;
    }

    offset += limit;
  }

  return items;
}

async function main() {
  const env = {
    ...readEnvFile(envPath),
    ...process.env,
  };

  const clerkSecretKey = requireEnv(env, "CLERK_SECRET_KEY");
  const supabaseUrl = requireEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");

  const clerkClient = createClerkClient({ secretKey: clerkSecretKey });
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const organizations = await fetchAllPages((pagination) =>
    clerkClient.organizations.getOrganizationList(pagination),
  );

  if (organizations.length === 0) {
    console.log("No Clerk organizations found. Create the first organization and rerun.");
    return;
  }

  let syncedOrganizations = 0;
  let syncedMemberships = 0;
  let syncedUsers = 0;

  for (const organization of organizations) {
    const ownerId =
      organization.createdBy ??
      readStringMetadata(organization.privateMetadata, "owner_id") ??
      readStringMetadata(organization.publicMetadata, "owner_id");

    if (!ownerId) {
      console.log(`Skipping organization ${organization.id} because owner id is missing.`);
      continue;
    }

    const payload = {
      clerk_org_id: organization.id,
      name: organization.name,
      slug: organization.slug,
      owner_id: ownerId,
      plan_type: resolvePlanType(organization),
    };

    const { data: existingOrganization, error: existingOrganizationError } = await supabase
      .from("organizations")
      .select("id")
      .eq("clerk_org_id", organization.id)
      .maybeSingle();

    if (existingOrganizationError) {
      throw new Error(
        `Failed to check organization ${organization.id}: ${existingOrganizationError.message}`,
      );
    }

    const organizationMutation = existingOrganization
      ? supabase.from("organizations").update(payload).eq("id", existingOrganization.id)
      : supabase.from("organizations").insert(payload);

    const { error: organizationError } = await organizationMutation;

    if (organizationError) {
      throw new Error(
        `Failed to persist organization ${organization.id}: ${organizationError.message}`,
      );
    }

    const { data: syncedOrganization, error: syncedOrganizationError } = await supabase
      .from("organizations")
      .select("id")
      .eq("clerk_org_id", organization.id)
      .maybeSingle();

    if (syncedOrganizationError || !syncedOrganization) {
      throw new Error(
        `Failed to resolve synced organization ${organization.id}: ${
          syncedOrganizationError?.message ?? "not found"
        }`,
      );
    }

    const memberships = await fetchAllPages((pagination) =>
      clerkClient.organizations.getOrganizationMembershipList({
        organizationId: organization.id,
        ...pagination,
      }),
    );

    for (const membership of memberships) {
      const userId = membership.publicUserData?.userId;

      if (!userId) {
        continue;
      }

      const fullName = buildFullName({
        firstName: membership.publicUserData?.firstName ?? null,
        lastName: membership.publicUserData?.lastName ?? null,
        username: null,
        fallbackIdentifier: membership.publicUserData?.identifier ?? null,
        userId,
      });

      const phoneNumber = extractPhoneNumber(membership.publicUserData?.identifier ?? null);

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          org_id: syncedOrganization.id,
          role: mapMembershipRole(membership.role, membership.publicMetadata),
          full_name: fullName,
          phone_number: phoneNumber,
        },
        { onConflict: "id" },
      );

      if (profileError) {
        throw new Error(
          `Failed to upsert profile ${userId} from membership ${membership.id}: ${profileError.message}`,
        );
      }

      syncedMemberships += 1;
    }
  }

  const users = await fetchAllPages((pagination) => clerkClient.users.getUserList(pagination));

  for (const user of users) {
    const fullName = buildFullName({
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username ?? null,
      fallbackIdentifier: user.emailAddresses?.[0]?.emailAddress ?? null,
      userId: user.id,
    });

    const phoneNumber = user.phoneNumbers?.[0]?.phoneNumber ?? null;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone_number: phoneNumber,
      })
      .eq("id", user.id);

    if (error) {
      throw new Error(`Failed to update profile ${user.id}: ${error.message}`);
    }

    syncedUsers += 1;
  }

  console.log(
    JSON.stringify(
      {
        organizationsSynced: syncedOrganizations,
        membershipsSynced: syncedMemberships,
        usersUpdated: syncedUsers,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
