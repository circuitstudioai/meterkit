"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function ApprovalsPage() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<number | null>(null);

  useEffect(() => {
    loadUser();
    loadRequests();
  }, []);

  const loadUser = async () => {
    const res = await fetch("/api/session");
    const data = await res.json();
    setUser(data.user);
  };

  const loadRequests = async () => {
    const res = await fetch("/api/requests");
    const data = await res.json();
    const pending = (data.requests || []).filter(
      (r: any) => r.status === "pending"
    );
    setRequests(pending);
  };

  const handleApproval = async (requestId: number, action: "approve" | "deny") => {
    if (!user) return;

    setLoading(requestId);

    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          approverId: user.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(
          action === "approve"
            ? `Request approved! Payment initiated.${data.payoutId ? `\nPayout ID: ${data.payoutId}` : ""}`
            : "Request denied."
        );
        loadRequests();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to process approval");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Approvals</h1>
          <p className="text-gray-600 mt-1">
            Review and approve pending purchase requests
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              {requests.length} request{requests.length !== 1 ? "s" : ""} awaiting your approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-500">
                    All caught up! No pending approvals.
                  </p>
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="border rounded-lg p-6 bg-white shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{req.toolName}</h3>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {req.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="font-semibold text-gray-900">
                            ${req.amount.toFixed(2)}
                          </span>
                          <span>Department: {req.department}</span>
                          {req.toolCategory && (
                            <span>Category: {req.toolCategory}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {req.policyReason && (
                      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900">
                              Policy Agent Decision
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                              {req.policyReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproval(req.id, "approve")}
                        disabled={loading === req.id}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve & Pay
                      </Button>
                      <Button
                        onClick={() => handleApproval(req.id, "deny")}
                        disabled={loading === req.id}
                        variant="outline"
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Deny
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
