import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

export function createSupabaseAdminClient() {
  return createClient(env.public.supabaseUrl, env.server.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
