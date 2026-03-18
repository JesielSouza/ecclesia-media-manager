"use client";

import type { PropsWithChildren } from "react";
import { ClerkProvider } from "@clerk/nextjs";

import { hasUsableClerkPublishableKey } from "@/modules/auth/lib/clerk-config";

type AuthProviderProps = PropsWithChildren;

export function AppClerkProvider({ children }: AuthProviderProps) {
  if (!hasUsableClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
