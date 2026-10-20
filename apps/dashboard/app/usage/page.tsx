"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { UsageGrid } from "@/components/usage-grid";

export default function UsagePage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => setRows(d.usage || []));
  }, []);

  return (
    <PageShell title="Usage" description="Every metered feature debit, with idempotency keys.">
      <UsageGrid
        rows={rows}
        columns={[
          { field: "userId", headerName: "User", flex: 1 },
          { field: "featureKey", headerName: "Feature", flex: 1 },
          { field: "units", headerName: "Units" },
          { field: "amount", headerName: "Credits" },
          { field: "balanceAfter", headerName: "Balance after" },
          { field: "idempotencyKey", headerName: "Idempotency", flex: 1 },
        ]}
      />
    </PageShell>
  );
}
