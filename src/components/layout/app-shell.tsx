import type { ReactNode } from "react";

import { OrganizationIdentity } from "@/modules/auth/components/organization-identity";

type AppShellProps = {
  children: ReactNode;
  organizationName?: string | null;
  orgRole?: string | null;
  userId?: string | null;
};

export function AppShell({
  children,
  organizationName,
  orgRole,
  userId,
}: AppShellProps) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-10 flex items-center justify-between rounded-[28px] border border-white/70 bg-white/65 px-5 py-4 shadow-soft backdrop-blur">
          <div className="space-y-1">
            <p className="font-[family-name:var(--font-heading)] text-xl font-bold">
              Ecclesia Media Manager
            </p>
            <p className="text-sm text-muted-foreground">
              Base do dashboard multi-tenant para ministerios de midia
            </p>
            {(organizationName || orgRole || userId) && (
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground/80">
                {organizationName || "Sem organizacao ativa"}
                {orgRole ? ` • ${orgRole}` : ""}
                {userId ? ` • ${userId}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-sm font-medium text-muted-foreground">
              Next.js App Router
            </div>
            <OrganizationIdentity />
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
