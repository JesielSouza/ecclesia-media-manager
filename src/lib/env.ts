function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name];

  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export const env = {
  public: {
    get appUrl() {
      return readRequiredEnv("NEXT_PUBLIC_APP_URL");
    },
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
    get abacatePayApiKey() {
      return readRequiredEnv("ABACATEPAY_API_KEY");
    },
    get abacatePayPremiumProductId() {
      return readRequiredEnv("ABACATEPAY_PREMIUM_PRODUCT_ID");
    },
    get abacatePayProProductId() {
      return readRequiredEnv("ABACATEPAY_PRO_PRODUCT_ID");
    },
    get abacatePayPublicKey() {
      return readRequiredEnv("ABACATEPAY_PUBLIC_KEY");
    },
    get abacatePayWebhookSecret() {
      return readRequiredEnv("ABACATEPAY_WEBHOOK_SECRET");
    },
    get clerkWebhookSecret() {
      return readRequiredEnv("CLERK_WEBHOOK_SECRET");
    },
    get clerkSupabaseJwtTemplate() {
      return readOptionalEnv("CLERK_SUPABASE_JWT_TEMPLATE") ?? "supabase";
    },
    get supabaseServiceRoleKey() {
      return readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    },
  },
};

export function hasAbacatePayEnv() {
  return Boolean(
    readOptionalEnv("NEXT_PUBLIC_APP_URL") &&
      readOptionalEnv("ABACATEPAY_API_KEY") &&
      readOptionalEnv("ABACATEPAY_PUBLIC_KEY") &&
      readOptionalEnv("ABACATEPAY_WEBHOOK_SECRET") &&
      readOptionalEnv("ABACATEPAY_PRO_PRODUCT_ID") &&
      readOptionalEnv("ABACATEPAY_PREMIUM_PRODUCT_ID"),
  );
}
