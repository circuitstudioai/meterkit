"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { UsageGrid } from "@/components/usage-grid";

export default function BalancesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/balances")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setRows(d.users || []);
      });
  }, []);

  return (
    <PageShell title="End-user balances" description="Prepaid credit remaining on each wallet.">
      {error ? <p className="text-red-700">{error}</p> : null}
      <UsageGrid
        rows={rows}
        columns={[
          { field: "name", headerName: "Name", flex: 1 },
          { field: "email", headerName: "Email", flex: 1 },
          { field: "externalUserId", headerName: "User id", flex: 1 },
          { field: "balance", headerName: "Credits" },
          { field: "lowBalanceThreshold", headerName: "Low-balance at" },
        ]}
      />
    </PageShell>
  );
}
