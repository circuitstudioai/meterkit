"use client";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageGrid } from "@/components/usage-grid";
import { LoadState } from "@/components/load-state";
import { requestJson, useResource } from "@/lib/use-resource";
export default function PayoutsPage() {
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useResource<{ payouts: Record<string, unknown>[] }>("/api/payouts");
  const [amount, setAmount] = useState("10");
  const [review, setReview] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const cashOut = async () => {
    setError("");
    setMessage("");
    setPending(true);
    try {
      const result = await requestJson<{ payout?: { status?: string } }>(
        "/api/payouts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usdAmount: Number(amount) }),
        },
      );
      if (!result.payout || result.payout.status === "failed")
        throw new Error("Payout failed");
      setMessage(
        "Payout request recorded. Check its status in the history below.",
      );
      setReview(false);
      reload();
    } catch {
      setError(
        "The payout could not be confirmed. Check the sandbox account and payout history before trying again.",
      );
      reload();
    } finally {
      setPending(false);
    }
  };
  return (
    <PageShell
      title="Builder payouts"
      description="Request a payout to the builder’s configured PayPal sandbox account. Review the amount before sending."
    >
      <Card className="mb-8 max-w-lg">
        <CardHeader>
          <CardTitle>Send a sandbox payout</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
                setError("Enter a USD amount greater than zero.");
                return;
              }
              setError("");
              setReview(true);
            }}
          >
            <p className="text-sm text-slate-600">
              Use test funds only. PayPal processes the payout; this dashboard
              records the request.
            </p>
            <label className="meter-field">
              Payout amount (USD)
              <Input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                value={amount}
                disabled={review || pending}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            {!review && <Button type="submit">Review payout</Button>}
            {review && (
              <section
                className="rounded border border-green-200 bg-green-50 p-4"
                aria-label="Confirm sandbox payout"
              >
                <p className="mb-4 text-sm">
                  Send{" "}
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(Number(amount))}{" "}
                  in sandbox funds to the configured builder account?
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    disabled={pending}
                    onClick={() => void cashOut()}
                  >
                    {pending ? "Sending…" : "Confirm sandbox payout"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setReview(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </section>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-800">
                {error}
              </p>
            )}
            <p role="status" className="text-sm text-green-800">
              {message}
            </p>
          </form>
        </CardContent>
      </Card>
      <h2 className="meter-section-label">Payout history</h2>
      <LoadState loading={loading} error={loadError} retry={reload} />
      {data && (
        <UsageGrid
          rows={data.payouts}
          emptyMessage="No payouts recorded. Sandbox payout requests will appear here with their status."
          columns={[
            { field: "usdAmount", headerName: "USD" },
            {
              field: "recipientEmail",
              headerName: "Recipient PayPal email",
              flex: 1,
            },
            { field: "paypalPayoutId", headerName: "Payout ID", flex: 1 },
            { field: "status", headerName: "Status" },
          ]}
        />
      )}
    </PageShell>
  );
}
