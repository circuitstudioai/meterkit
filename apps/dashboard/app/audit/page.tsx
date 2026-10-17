"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch } from "lucide-react";

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("approved")) return "text-green-700 bg-green-50";
    if (action.includes("denied")) return "text-red-700 bg-red-50";
    if (action.includes("topup")) return "text-blue-700 bg-blue-50";
    return "text-gray-700 bg-gray-50";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-gray-600 mt-1">
            Complete history of all wallet activities and decisions
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FileSearch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No audit logs yet</p>
                </div>
              ) : (
                auditLogs.map((log) => {
                  const details = JSON.parse(log.details);
                  return (
                    <div
                      key={log.id}
                      className="border-l-4 border-blue-500 pl-4 py-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionColor(
                              log.action
                            )}`}
                          >
                            {log.action.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <div className="mt-2 text-sm">
                            {details.toolName && (
                              <p className="font-medium">
                                Tool: {details.toolName}
                              </p>
                            )}
                            {details.amount && (
                              <p className="text-gray-600">
                                Amount: ${details.amount.toFixed(2)}
                              </p>
                            )}
                            {details.transactionId && (
                              <p className="text-gray-600 font-mono text-xs">
                                Transaction: {details.transactionId}
                              </p>
                            )}
                            {details.payoutId && (
                              <p className="text-gray-600 font-mono text-xs">
                                Payout: {details.payoutId}
                              </p>
                            )}
                            {details.reason && (
                              <p className="text-gray-600 mt-1">
                                Reason: {details.reason}
                              </p>
                            )}
                            {details.llmExplanation && (
                              <p className="text-gray-600 mt-1 italic">
                                {details.llmExplanation}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
