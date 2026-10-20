"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";

type AppRow = { id: number; name: string; slug: string; features: number; users: number };

export default function AppsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/apps")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setApps(d.apps || []);
      });
  }, []);

  return (
    <PageShell title="Apps" description="Each app has its own feature catalog and end-user wallets.">
      {error ? <p className="text-red-700">{error}</p> : null}
      {apps.length === 0 && !error ? (
        <p className="text-slate-500">No apps yet. Seed the database to load the Northwind Chat demo.</p>
      ) : null}
      <div className="grid gap-4">
        {apps.map((app) => (
          <Card key={app.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div>
                <h2 className="text-lg font-semibold">{app.name}</h2>
                <p className="text-sm text-slate-500">{app.slug}</p>
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
