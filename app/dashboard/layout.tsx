import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireActiveSessionContext } from "@/modules/auth/server/session";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await requireActiveSessionContext("/dashboard");

  return (
    <AppShell
      organizationName={session.organizationName}
      orgRole={session.orgRole}
      userId={session.userId}
    >
      {children}
    </AppShell>
  );
}
