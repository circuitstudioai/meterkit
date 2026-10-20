"use client";

import { useEffect, useState } from "react";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

export default function WalletPage() {
  const [stats, setStats] = useState<any>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadStats();

    // Check for return from PayPal
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccess(`Successfully added $${params.get("amount")} to wallet!`);
      window.history.replaceState({}, "", "/wallet");
    } else if (params.get("error")) {
      setError(`Payment failed: ${params.get("error")}`);
      window.history.replaceState({}, "", "/wallet");
    }
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/wallet/stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const handleTopup = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (data.approveUrl) {
        // Redirect to PayPal for approval
        window.location.href = data.approveUrl;
      }
    } catch (err: any) {
      setError(err.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-gray-600 mt-1">
            Manage your AI tool budget with PayPal
          </p>
        </div>

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats?.balance?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available for AI tool purchases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Spend
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats?.monthlySpend?.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total spent this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approvals
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.pendingApprovals || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Requests awaiting review
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Top Up Wallet</CardTitle>
            <CardDescription>
              Add funds to your AI spend budget via PayPal sandbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="100.00"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <Button
              onClick={handleTopup}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Processing..." : "Top Up with PayPal"}
            </Button>
            <p className="text-xs text-gray-500">
              You'll be redirected to PayPal sandbox to complete the payment
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
