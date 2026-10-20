"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { FileSearch } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<{ id: number; action: string; details: string; createdAt: string }[]>([]);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs || []));
  }, []);

  return (
    <PageShell title="Audit log" description="Top-ups, debits, payouts, and verified PayPal webhooks.">
      {logs.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <FileSearch className="mx-auto mb-3 h-10 w-10" />
          No events yet.
        </div>
      ) : (
        <ol className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="border-l-4 border-slate-900 pl-4">
              <p className="font-mono text-xs uppercase">{log.action}</p>
              <p className="break-all text-sm text-slate-600">{log.details}</p>
              <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ol>
      )}
    </PageShell>
  );
}
