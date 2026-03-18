function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  public: {
    get clerkPublishableKey() {
      return readRequiredEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    },
    get supabaseAnonKey() {
      return readRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    },
    get supabaseUrl() {
      return readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    },
  },
  server: {
    get clerkWebhookSecret() {
      return readRequiredEnv("CLERK_WEBHOOK_SECRET");
    },
    get supabaseServiceRoleKey() {
      return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    },
  },
};
