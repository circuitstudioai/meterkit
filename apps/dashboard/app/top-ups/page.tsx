"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageGrid } from "@/components/usage-grid";
import { usdToCredits } from "@/lib/credits";

export default function TopUpsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [amount, setAmount] = useState("10");
  const [userId, setUserId] = useState("user_alex");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () =>
    fetch("/api/topups")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setRows(d.topups || []);
      });

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      setMessage(`Top-up captured. ${params.get("credits") || ""} credits added.`);
    } else if (params.get("error")) {
      setError(params.get("error") || "Top-up failed");
    }
  }, []);

  const startTopUp = async () => {
    setError("");
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), userId }),
    });
    const data = await res.json();
    if (data.approveUrl) {
      window.location.href = data.approveUrl;
      return;
    }
    setError(data.error || "PayPal sandbox is not configured. You can still inspect seeded top-ups.");
  };

  return (
    <PageShell
      title="Top-ups"
      description="PayPal Orders v2. Funds settle to the builder PayPal account; MeterKit only credits the ledger."
    >
      {message ? <p className="mb-4 rounded bg-green-50 p-3 text-green-800">{message}</p> : null}
      {error ? <p className="mb-4 rounded bg-amber-50 p-3 text-amber-900">{error}</p> : null}
      <Card className="mb-6 max-w-md">
        <CardHeader>
          <CardTitle>Sandbox top-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={userId} onChange={(e) => setUserId(e.target.value)} />
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-xs text-slate-500">
            ${amount || 0} → {usdToCredits(Number(amount) || 0)} credits
          </p>
          <Button onClick={startTopUp}>Top up with PayPal</Button>
        </CardContent>
      </Card>
      <UsageGrid
        rows={rows}
        columns={[
          { field: "userId", headerName: "User", flex: 1 },
          { field: "usdAmount", headerName: "USD" },
          { field: "credits", headerName: "Credits" },
          { field: "paypalOrderId", headerName: "PayPal order", flex: 1 },
          { field: "status", headerName: "Status" },
        ]}
      />
    </PageShell>
  );
}
