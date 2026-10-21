"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageGrid } from "@/components/usage-grid";
import { LoadState } from "@/components/load-state";
import { requestJson, useResource } from "@/lib/use-resource";
import { usdToCredits } from "@/lib/credits";
export default function TopUpsPage() {
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useResource<{ topups: Record<string, unknown>[] }>("/api/topups");
  const [amount, setAmount] = useState("10");
  const [userId, setUserId] = useState("user_alex");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [returned, setReturned] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("success") || params.has("error"))
      queueMicrotask(() => setReturned(true));
  }, []);
  const startTopUp = async () => {
    setError("");
    if (
      !userId.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      setError("Enter a wallet user ID and a USD amount greater than zero.");
      return;
    }
    setPending(true);
    try {
      const result = await requestJson<{ approveUrl?: string }>(
        "/api/paypal/create-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(amount),
            userId: userId.trim(),
          }),
        },
      );
      if (!result.approveUrl) throw new Error("Missing approval URL");
      window.location.assign(result.approveUrl);
    } catch {
      setError(
        "Could not open PayPal checkout. Check the sandbox setup and try again. No top-up has been confirmed.",
      );
      setPending(false);
    }
  };
  return (
    <PageShell
      title="Top-ups"
      description="Add prepaid credits through PayPal sandbox. Review the capture status in the history below."
    >
      {returned && (
        <p
          role="status"
          className="mb-4 rounded border border-green-200 bg-green-50 p-4 text-sm text-green-900"
        >
          You returned from PayPal. Check the transaction history below to
          confirm whether payment was captured.
        </p>
      )}
      <Card className="mb-8 max-w-lg">
        <CardHeader>
          <CardTitle>Test a wallet top-up</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void startTopUp();
            }}
          >
            <p className="text-sm text-slate-600">
              Use a sandbox buyer account. This demo does not use real money.
            </p>
            <label className="meter-field">
              Wallet user ID
              <Input
                name="userId"
                autoComplete="off"
                spellCheck={false}
                required
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
              />
            </label>
            <label className="meter-field">
              Top-up amount (USD)
              <Input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <p className="text-sm text-slate-600">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(Number(amount) || 0)}{" "}
              adds {usdToCredits(Number(amount) || 0)} credits at the demo rate.
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? "Opening PayPal…" : "Continue to PayPal sandbox"}
            </Button>
            {error && (
              <p role="alert" className="text-sm text-red-800">
                {error}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
      <h2 className="meter-section-label">Top-up history</h2>
      <LoadState loading={loading} error={loadError} retry={reload} />
      {data && (
        <UsageGrid
          rows={data.topups}
          emptyMessage="No top-ups recorded. A captured sandbox payment will appear here."
          columns={[
            { field: "userId", headerName: "User", flex: 1 },
            { field: "usdAmount", headerName: "USD" },
            { field: "credits", headerName: "Credits" },
            { field: "paypalOrderId", headerName: "PayPal order", flex: 1 },
            { field: "status", headerName: "Status" },
          ]}
        />
      )}
    </PageShell>
  );
}
