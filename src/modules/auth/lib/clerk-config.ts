const CLERK_PUBLISHABLE_KEY_PATTERN = /^pk_(test|live)_/;

export function hasUsableClerkPublishableKey(value?: string | null) {
  return (
    typeof value === "string" &&
    CLERK_PUBLISHABLE_KEY_PATTERN.test(value)
  );
}

export function isClerkConfigured() {
  return hasUsableClerkPublishableKey(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
}
