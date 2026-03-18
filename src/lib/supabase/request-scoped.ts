import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

type RequestScopedSupabaseParams = {
  accessToken?: string | null;
  clerkOrgId: string;
  organizationId?: string | null;
  userId: string;
};

export function createRequestScopedSupabaseClient(
  params: RequestScopedSupabaseParams,
) {
  const headers: Record<string, string> = {
    "x-clerk-org-id": params.clerkOrgId,
  };

  if (params.accessToken) {
    headers.Authorization = `Bearer ${params.accessToken}`;
  } else {
    headers["x-clerk-user-id"] = params.userId;
    headers["x-user-id"] = params.userId;
  }

  if (params.organizationId) {
    headers["x-org-id"] = params.organizationId;
  }

  return createClient(env.public.supabaseUrl, env.public.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers,
    },
  });
}
