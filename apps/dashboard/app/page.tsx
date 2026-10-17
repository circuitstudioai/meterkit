"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@meterkit/config";

type Overview = {
  apps: number;
  endUsers: number;
  features: number;
  creditsOnBooks: number;
  outstandingUsd: number;
  topupUsd: number;
  payoutUsd: number;
  usageCredits: number;
};

export default function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/overview")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const cards = data
    ? [
        ["Apps", data.apps],
        ["End users", data.endUsers],
        ["Priced features", data.features],
        ["Credits on books", data.creditsOnBooks.toFixed(0)],
        ["Top-ups (USD)", `$${data.topupUsd.toFixed(2)}`],
        ["Usage credits", data.usageCredits.toFixed(0)],
        ["Paid out (USD)", `$${data.payoutUsd.toFixed(2)}`],
      ]
    : [];

  return (
    <PageShell
      title={`${BRAND.name} for builders`}
      description="Prepaid credits on your features. PayPal captures money into your account; this dashboard only keeps the ledger."
    >
      {error ? (
        <p className="rounded bg-red-50 p-3 text-red-800">{error}</p>
      ) : null}
      {!data && !error ? <p className="text-slate-500">Loading overview…</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-500">{BRAND.settlementNote}</p>
    </PageShell>
  );
}
