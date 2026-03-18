"use client";

import {
  OrganizationSwitcher,
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

import { authRoutes } from "@/modules/auth/constants/routes";

function hasUsablePublishableKey() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    typeof publishableKey === "string" &&
    /^pk_(test|live)_/.test(publishableKey)
  );
}

export function OrganizationIdentity() {
  if (!hasUsablePublishableKey()) {
    return null;
  }

  return (
    <>
      <SignedIn>
        <div className="flex items-center gap-3">
          <OrganizationSwitcher
            afterSelectOrganizationUrl={authRoutes.dashboard}
            afterCreateOrganizationUrl={authRoutes.dashboard}
            afterLeaveOrganizationUrl={authRoutes.orgSelection}
          />
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-full border border-border/80 bg-background/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            Entrar
          </button>
        </SignInButton>
      </SignedOut>
    </>
  );
}
