"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageGrid } from "@/components/usage-grid";
import { creditsToUsd } from "@/lib/credits";

export default function RevenuePage() {
  const [topups, setTopups] = useState<Record<string, unknown>[]>([]);
  const [usage, setUsage] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetch("/api/topups")
      .then((r) => r.json())
      .then((d) => setTopups(d.topups || []));
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => setUsage(d.usage || []));
  }, []);

  const topupUsd = useMemo(
    () =>
      topups
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + Number(t.usdAmount || 0), 0),
    [topups]
  );
  const usageCredits = useMemo(
    () => usage.reduce((sum, u) => sum + Math.abs(Number(u.amount || 0)), 0),
    [usage]
  );

  return (
    <PageShell title="Revenue" description="Top-up cash in vs credits consumed. Platform fee is 0% in this demo.">
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Captured top-ups</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">${topupUsd.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">Credits consumed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {usageCredits.toFixed(0)} (~${creditsToUsd(usageCredits).toFixed(2)})
          </CardContent>
        </Card>
      </div>
      <UsageGrid
        rows={topups}
        columns={[
          { field: "userId", headerName: "User", flex: 1 },
          { field: "usdAmount", headerName: "USD" },
          { field: "credits", headerName: "Credits" },
          { field: "status", headerName: "Status" },
          { field: "paypalOrderId", headerName: "PayPal", flex: 1 },
        ]}
      />
    </PageShell>
  );
}
