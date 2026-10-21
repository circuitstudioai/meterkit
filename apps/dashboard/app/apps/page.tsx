"use client";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { LoadState } from "@/components/load-state";
import { useResource } from "@/lib/use-resource";
type AppRow = {
  id: number;
  name: string;
  slug: string;
  features: number;
  users: number;
};
export default function AppsPage() {
  const { data, loading, error, reload } = useResource<{ apps: AppRow[] }>(
    "/api/apps",
  );
  return (
    <PageShell
      title="Apps"
      description="Review each app’s priced features and prepaid wallets."
    >
      <LoadState loading={loading} error={error} retry={reload} />
      {data?.apps.length === 0 && (
        <div className="meter-empty">
          <h2>No apps yet</h2>
          <p>
            The sample setup adds Northwind Chat with example prices and
            wallets.
          </p>
          <a href="https://github.com/circuitstudioai/meterkit/blob/main/docs/SETUP.md">
            Read the demo setup guide →
          </a>
        </div>
      )}
      <div className="grid gap-4">
        {data?.apps.map((app) => (
          <Card key={app.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold">
                  {app.name}
                </h2>
                <p className="break-all text-sm text-slate-600">{app.slug}</p>
              </div>
              <p className="text-sm text-slate-600">
                {app.features} features · {app.users} end users
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
