"use client";

import type { PropsWithChildren } from "react";
import { ClerkProvider } from "@clerk/nextjs";

type AuthProviderProps = PropsWithChildren;

function hasUsablePublishableKey() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    typeof publishableKey === "string" &&
    /^pk_(test|live)_/.test(publishableKey)
  );
}

export function AppClerkProvider({ children }: AuthProviderProps) {
  if (!hasUsablePublishableKey()) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
