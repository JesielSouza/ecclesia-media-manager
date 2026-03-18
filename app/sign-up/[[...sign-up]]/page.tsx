import { SignUp } from "@clerk/nextjs";

import { AuthPanel } from "@/components/layout/auth-panel";
import { ClerkMisconfiguredState } from "@/modules/auth/components/clerk-misconfigured-state";
import { authRoutes } from "@/modules/auth/constants/routes";
import { isClerkConfigured } from "@/modules/auth/lib/clerk-config";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { returnTo } = await searchParams;
  const clerkConfigured = isClerkConfigured();

  return (
    <AuthPanel
      title="Crie seu acesso"
      description="Cadastre a conta inicial para configurar sua igreja e seguir para a selecao da organizacao."
    >
      {clerkConfigured ? (
        <SignUp
          fallback={<div className="h-[640px]" />}
          path={authRoutes.signUp}
          routing="path"
          signInUrl={authRoutes.signIn}
          forceRedirectUrl={returnTo || authRoutes.orgSelection}
        />
      ) : (
        <ClerkMisconfiguredState />
      )}
    </AuthPanel>
  );
}
