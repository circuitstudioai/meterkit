"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Clock, XCircle } from "lucide-react";

export default function RequestsPage() {
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    toolName: "",
    toolCategory: "",
    amount: "",
    description: "",
    vendorEmail: "",
  });

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
    setRequests(data.requests || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          department: user.department,
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(
          `Request submitted!\n\nDecision: ${data.decision.decision}\nReason: ${data.decision.reason}\n\nExplanation: ${data.decision.explanation}`
        );
        setFormData({
          toolName: "",
          toolCategory: "",
          amount: "",
          description: "",
          vendorEmail: "",
        });
        setShowForm(false);
        loadRequests();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "approved":
        return <Badge className="bg-blue-600">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "denied":
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Purchase Requests</h1>
            <p className="text-gray-600 mt-1">
              Request AI tool purchases and track approvals
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>New Purchase Request</CardTitle>
              <CardDescription>
                Submit a request for AI tool purchase. The policy agent will
                automatically evaluate it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="toolName">Tool Name *</Label>
                    <Input
                      id="toolName"
                      required
                      value={formData.toolName}
                      onChange={(e) =>
                        setFormData({ ...formData, toolName: e.target.value })
                      }
                      placeholder="e.g. ChatGPT Plus"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toolCategory">Category</Label>
                    <Input
                      id="toolCategory"
                      value={formData.toolCategory}
                      onChange={(e) =>
                        setFormData({ ...formData, toolCategory: e.target.value })
                      }
                      placeholder="e.g. AI Assistant"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      placeholder="20.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendorEmail">Vendor Email</Label>
                    <Input
                      id="vendorEmail"
                      type="email"
                      value={formData.vendorEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, vendorEmail: e.target.value })
                      }
                      placeholder="vendor@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="e.g. Monthly subscription for content creation"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Submitting..." : "Submit Request"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No requests yet. Create your first request to get started.
                </p>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{req.toolName}</h3>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {req.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Amount: ${req.amount.toFixed(2)}</span>
                          <span>Department: {req.department}</span>
                          {req.toolCategory && (
                            <span>Category: {req.toolCategory}</span>
                          )}
                        </div>
                        {req.policyReason && (
                          <div className="mt-2 text-xs bg-blue-50 text-blue-700 p-2 rounded">
                            <strong>Policy Decision:</strong> {req.policyReason}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
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
