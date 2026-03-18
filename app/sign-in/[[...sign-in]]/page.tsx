import { SignIn } from "@clerk/nextjs";

import { AuthPanel } from "@/components/layout/auth-panel";
import { authRoutes } from "@/modules/auth/constants/routes";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams: Promise<{
    returnTo?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { returnTo } = await searchParams;

  return (
    <AuthPanel
      title="Acesse o Ecclesia Media Manager"
      description="Entre com sua conta para continuar no dashboard administrativo."
    >
      <SignIn
        fallback={<div className="h-[540px]" />}
        path={authRoutes.signIn}
        routing="path"
        signUpUrl={authRoutes.signUp}
        forceRedirectUrl={returnTo || authRoutes.dashboard}
      />
    </AuthPanel>
  );
}
