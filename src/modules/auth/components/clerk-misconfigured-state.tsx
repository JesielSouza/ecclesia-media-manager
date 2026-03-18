import { AlertTriangle } from "lucide-react";

export function ClerkMisconfiguredState() {
  return (
    <div className="rounded-[28px] border border-amber-200 bg-amber-50/90 p-6 text-amber-950 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
          <AlertTriangle className="size-5" />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-lg font-semibold">Clerk nao configurado</p>
            <p className="mt-1 text-sm text-amber-900/80">
              A tela de autenticacao foi protegida para nao quebrar sem provider.
            </p>
          </div>

          <div className="space-y-1 text-sm text-amber-900/90">
            <p>Configure um arquivo <code>.env.local</code> com:</p>
            <p><code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...</code></p>
            <p><code>CLERK_SECRET_KEY=sk_test_...</code></p>
            <p>Depois reinicie o servidor Next.js.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
