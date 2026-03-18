import { OrganizationList } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/layout/auth-panel";
import { authRoutes } from "@/modules/auth/constants/routes";
import { getActiveSessionContext } from "@/modules/auth/server/session";

export const dynamic = "force-dynamic";

type SelectOrganizationPageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function SelectOrganizationPage({
  searchParams,
}: SelectOrganizationPageProps) {
  const { returnTo } = await searchParams;
  const session = await getActiveSessionContext();

  if (!session.userId) {
    redirect(
      `${authRoutes.signIn}?returnTo=${encodeURIComponent(
        returnTo || authRoutes.dashboard,
      )}` as never,
    );
  }

  if (session.orgId) {
    redirect((returnTo || authRoutes.dashboard) as never);
  }

  return (
    <AuthPanel
      title="Escolha a organizacao ativa"
      description="Selecione a igreja que deseja administrar agora. Esse contexto sera usado nas proximas consultas com isolamento por tenant."
    >
      <OrganizationList
        fallback={<div className="h-[560px]" />}
        hidePersonal
        afterSelectOrganizationUrl={returnTo || authRoutes.dashboard}
        afterCreateOrganizationUrl={returnTo || authRoutes.dashboard}
      />
    </AuthPanel>
  );
}
