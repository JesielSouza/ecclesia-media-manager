import type { ReactNode } from "react";
import Link from "next/link";

type AuthPanelProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function AuthPanel({ children, description, title }: AuthPanelProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,155,84,0.18),_transparent_28%),linear-gradient(180deg,_rgba(255,248,240,0.96),_rgba(249,244,236,1))] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-soft backdrop-blur lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-between bg-foreground px-8 py-10 text-white sm:px-10 lg:px-12">
            <div className="space-y-5">
              <Link
                href="/"
                className="inline-flex w-fit rounded-full border border-white/20 px-4 py-1 text-sm font-semibold text-white/80"
              >
                Ecclesia Media Manager
              </Link>
              <div className="space-y-4">
                <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight text-balance">
                  {title}
                </h1>
                <p className="max-w-md text-base text-white/70">{description}</p>
              </div>
            </div>
            <p className="mt-10 max-w-sm text-sm text-white/60">
              Fluxo preparado para autenticar com Clerk e exigir a organizacao ativa
              antes do acesso ao dashboard.
            </p>
          </div>
          <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
