"use client";

import { useMemo } from "react";
import { useResource } from "@/lib/use-resource";
import { LoadState } from "@/components/load-state";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageGrid } from "@/components/usage-grid";
import { creditsToUsd } from "@/lib/credits";

export default function RevenuePage() {
  const receipts = useResource<{ topups: Record<string, unknown>[] }>(
    "/api/topups",
  );
  const debits = useResource<{ usage: Record<string, unknown>[] }>(
    "/api/usage",
  );
  const topups = useMemo(() => receipts.data?.topups || [], [receipts.data]);
  const usage = useMemo(() => debits.data?.usage || [], [debits.data]);
  const ready = Boolean(receipts.data && debits.data);

  const topupUsd = useMemo(
    () =>
      topups
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + Number(t.usdAmount || 0), 0),
    [topups],
  );
  const usageCredits = useMemo(
    () => usage.reduce((sum, u) => sum + Math.abs(Number(u.amount || 0)), 0),
    [usage],
  );

  return (
    <PageShell
      title="Revenue"
      description="Compare captured top-ups with credits used. This demo charges no platform fee."
    >
      <LoadState
        loading={receipts.loading || debits.loading}
        error={receipts.error || debits.error}
        retry={() => {
          receipts.reload();
          debits.reload();
        }}
      />
      {ready && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">
                  Captured top-ups
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                ${topupUsd.toFixed(2)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-slate-500">
                  Credits consumed
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {usageCredits.toFixed(0)} (~$
                {creditsToUsd(usageCredits).toFixed(2)})
              </CardContent>
            </Card>
          </div>
          <UsageGrid
            rows={topups}
            emptyMessage="No top-ups recorded. Captured payments will appear here."
            columns={[
              { field: "userId", headerName: "User", flex: 1 },
              { field: "usdAmount", headerName: "USD" },
              { field: "credits", headerName: "Credits" },
              { field: "status", headerName: "Status" },
              { field: "paypalOrderId", headerName: "PayPal", flex: 1 },
            ]}
          />
        </>
      )}
    </PageShell>
  );
}
