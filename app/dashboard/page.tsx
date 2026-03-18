import { CalendarCheck2, ClipboardList, FolderKanban } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardNavigation } from "@/modules/dashboard/constants/navigation";

const metrics = [
  {
    title: "Escalas",
    value: "12",
    description: "cultos planejados no mes",
    icon: CalendarCheck2,
  },
  {
    title: "Checklists",
    value: "32",
    description: "tarefas operacionais catalogadas",
    icon: ClipboardList,
  },
  {
    title: "Assets",
    value: "84",
    description: "links e materiais centralizados",
    icon: FolderKanban,
  },
] as const;

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Rotas protegidas por Clerk e fluxo de organizacao ativa prontos para a
          camada de CRUD e integracao multi-tenant.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map(({ title, value, description, icon: Icon }) => (
          <Card key={title} className="border-white/70 bg-white/85 shadow-soft">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{title}</CardTitle>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {dashboardNavigation.map((item) => (
          <Card key={item.href} className="border-border/70 bg-background/80">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
