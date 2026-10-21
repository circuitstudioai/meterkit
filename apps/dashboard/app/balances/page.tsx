"use client";

import { useResource } from "@/lib/use-resource";
import { LoadState } from "@/components/load-state";
import { PageShell } from "@/components/page-shell";
import { UsageGrid } from "@/components/usage-grid";

export default function BalancesPage() {
  const { data, loading, error, reload } = useResource<{
    users: Record<string, unknown>[];
  }>("/api/balances");

  return (
    <PageShell
      title="End-user balances"
      description="Check the prepaid credits remaining in each wallet."
    >
      <LoadState loading={loading} error={error} retry={reload} />
      {data && (
        <UsageGrid
          rows={data.users}
          emptyMessage="No wallets yet. The sample setup includes 3 example wallets."
          columns={[
            { field: "name", headerName: "Name", flex: 1 },
            { field: "email", headerName: "Email", flex: 1 },
            { field: "externalUserId", headerName: "User id", flex: 1 },
            { field: "balance", headerName: "Credits" },
            { field: "lowBalanceThreshold", headerName: "Low-balance at" },
          ]}
        />
      )}
    </PageShell>
  );
}
