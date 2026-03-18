import { SignIn } from "@clerk/nextjs";

import { AuthPanel } from "@/components/layout/auth-panel";
import { ClerkMisconfiguredState } from "@/modules/auth/components/clerk-misconfigured-state";
import { authRoutes } from "@/modules/auth/constants/routes";
import { isClerkConfigured } from "@/modules/auth/lib/clerk-config";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { returnTo } = await searchParams;
  const clerkConfigured = isClerkConfigured();

  return (
    <AuthPanel
      title="Acesse o Ecclesia Media Manager"
      description="Entre com sua conta para continuar no dashboard administrativo."
    >
      {clerkConfigured ? (
        <SignIn
          fallback={<div className="h-[540px]" />}
          path={authRoutes.signIn}
          routing="path"
          signUpUrl={authRoutes.signUp}
          forceRedirectUrl={returnTo || authRoutes.dashboard}
        />
      ) : (
        <ClerkMisconfiguredState />
      )}
    </AuthPanel>
  );
}
