"use client";

import { useResource } from "@/lib/use-resource";
import { LoadState } from "@/components/load-state";
import { PageShell } from "@/components/page-shell";
import { UsageGrid } from "@/components/usage-grid";

export default function UsagePage() {
  const { data, loading, error, reload } = useResource<{
    usage: Record<string, unknown>[];
  }>("/api/usage");

  return (
    <PageShell
      title="Usage"
      description="Review credits charged for each feature call. Request keys help you trace repeated calls."
    >
      <LoadState loading={loading} error={error} retry={reload} />
      {data && (
        <UsageGrid
          rows={data.usage}
          emptyMessage="No usage recorded. Metered feature calls will appear here."
          columns={[
            { field: "userId", headerName: "User", flex: 1 },
            { field: "featureKey", headerName: "Feature", flex: 1 },
            { field: "units", headerName: "Units" },
            { field: "amount", headerName: "Credits" },
            { field: "balanceAfter", headerName: "Balance after" },
            { field: "idempotencyKey", headerName: "Request key", flex: 1 },
          ]}
        />
      )}
    </PageShell>
  );
}
