"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageGrid } from "@/components/usage-grid";
import { BRAND } from "@meterkit/config";

export default function PayoutsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [amount, setAmount] = useState("10");
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/payouts")
      .then((r) => r.json())
      .then((d) => setRows(d.payouts || []));

  useEffect(() => {
    load();
  }, []);

  const cashOut = async () => {
    setError("");
    const res = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usdAmount: Number(amount) }),
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    load();
  };

  return (
    <PageShell
      title="Builder payouts"
      description="Cash out to the builder PayPal sandbox account via the Payouts API."
    >
      <p className="mb-4 text-sm text-slate-600">{BRAND.settlementNote}</p>
      {error ? <p className="mb-3 text-amber-800">{error}</p> : null}
      <Card className="mb-6 max-w-md">
        <CardHeader>
          <CardTitle>Cash out</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button onClick={cashOut}>Send sandbox payout</Button>
        </CardContent>
      </Card>
      <UsageGrid
        rows={rows}
        columns={[
          { field: "usdAmount", headerName: "USD" },
          { field: "recipientEmail", headerName: "PayPal", flex: 1 },
          { field: "paypalPayoutId", headerName: "Payout id", flex: 1 },
          { field: "status", headerName: "Status" },
        ]}
      />
    </PageShell>
  );
}
