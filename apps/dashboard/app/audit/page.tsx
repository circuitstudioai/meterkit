"use client";

import { useResource } from "@/lib/use-resource";
import { LoadState } from "@/components/load-state";
import { PageShell } from "@/components/page-shell";
import { FileSearch } from "lucide-react";

export default function AuditPage() {
  const { data, loading, error, reload } = useResource<{
    logs: { id: number; action: string; details: string; createdAt: string }[];
  }>("/api/audit");
  const logs = data?.logs || [];

  return (
    <PageShell
      title="Audit log"
      description="Top-ups, debits, payouts, and PayPal webhook events."
    >
      <LoadState loading={loading} error={error} retry={reload} />
      {data &&
        (logs.length === 0 ? (
          <div className="py-12 text-center text-slate-600">
            <FileSearch className="mx-auto mb-3 h-10 w-10" aria-hidden="true" />
            No events recorded. Top-ups, usage charges, and payout requests will
            appear here.
          </div>
        ) : (
          <ol className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="border-l-4 border-slate-900 pl-4">
                <p className="font-mono text-xs uppercase">{log.action}</p>
                <p className="break-all text-sm text-slate-600">
                  {log.details}
                </p>
                <p className="text-xs text-slate-600">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        ))}
    </PageShell>
  );
}
