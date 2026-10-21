"use client";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadState } from "@/components/load-state";
import { useResource } from "@/lib/use-resource";
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
const count = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
export default function OverviewPage() {
  const { data, error, loading, reload } =
    useResource<Overview>("/api/overview");
  const cards = data
    ? [
        ["Wallet credits remaining", count.format(data.creditsOnBooks)],
        ["Credits used", count.format(data.usageCredits)],
        ["Top-ups received (USD)", usd.format(data.topupUsd)],
        ["Payouts recorded (USD)", usd.format(data.payoutUsd)],
        ["Apps", count.format(data.apps)],
        ["End users", count.format(data.endUsers)],
        ["Priced features", count.format(data.features)],
      ]
    : [];
  return (
    <PageShell
      title="Credits, usage, and payments"
      description="Track prepaid balances and feature usage. Review PayPal top-ups and payout records."
    >
      <LoadState loading={loading} error={error} retry={reload} />
      {data?.apps === 0 && (
        <section className="meter-empty mb-6">
          <h2>No apps in this ledger yet</h2>
          <p>
            Start with the Northwind Chat sample to try feature pricing, wallet
            balances, and sandbox payments.
          </p>
          <a
            href="https://github.com/circuitstudioai/meterkit/blob/main/docs/SETUP.md"
            target="_blank"
            rel="noreferrer"
          >
            Open the demo setup guide
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {value}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm leading-6 text-slate-600">
        {BRAND.settlementNote}
      </p>
      {data && (
        <Link
          href="/usage"
          className="mt-3 inline-block py-3 text-sm font-medium underline underline-offset-4"
        >
          Review feature usage →
        </Link>
      )}
    </PageShell>
  );
}
