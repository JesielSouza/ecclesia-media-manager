import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { authRoutes } from "@/modules/auth/constants/routes";

export type ActiveSessionContext = {
  organizationName: string | null;
  orgId: string | null;
  orgRole: string | null;
  orgSlug: string | null;
  supabaseAccessToken: string | null;
  userId: string | null;
};

async function resolveOrganizationName(orgId: string | null): Promise<string | null> {
  if (!orgId) {
    return null;
  }

  try {
    const client = await clerkClient();
    const organization = await client.organizations.getOrganization({
      organizationId: orgId,
    });

    return organization.name;
  } catch (error) {
    console.error("Failed to resolve active Clerk organization.", error);
    return null;
  }
}

async function resolveSupabaseAccessToken(
  session: Awaited<ReturnType<typeof auth>>,
): Promise<string | null> {
  if (!session.userId) {
    return null;
  }

  try {
    return await session.getToken({
      template: env.server.clerkSupabaseJwtTemplate,
    });
  } catch (error) {
    console.error("Failed to resolve Clerk Supabase JWT template token.", error);
    return null;
  }
}

export async function getActiveSessionContext(): Promise<ActiveSessionContext> {
  const session = await auth();

  return {
    organizationName: await resolveOrganizationName(session.orgId ?? null),
    orgId: session.orgId ?? null,
    orgRole: session.orgRole ?? null,
    orgSlug: session.orgSlug ?? null,
    supabaseAccessToken: await resolveSupabaseAccessToken(session),
    userId: session.userId ?? null,
  };
}

export async function requireActiveSessionContext(
  returnTo: string = authRoutes.dashboard,
) {
  const context = await getActiveSessionContext();

  if (!context.userId) {
    redirect(
      `${authRoutes.signIn}?returnTo=${encodeURIComponent(returnTo)}` as never,
    );
  }

  if (!context.orgId) {
    redirect(
      `${authRoutes.orgSelection}?returnTo=${encodeURIComponent(returnTo)}` as never,
    );
  }

  return context as ActiveSessionContext & {
    orgId: string;
    supabaseAccessToken: string | null;
    userId: string;
  };
}
