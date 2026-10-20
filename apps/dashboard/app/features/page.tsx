"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Price = {
  featureKey: string;
  name: string;
  creditsPerUnit: number;
  unitLabel: string;
};

export default function FeaturesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const load = () =>
    fetch("/api/meter/prices")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setPrices(d.prices || []);
      });

  useEffect(() => {
    load();
  }, []);

  const save = async (price: Price) => {
    setSaving(price.featureKey);
    await fetch("/api/meter/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(price),
    });
    setSaving("");
    load();
  };

  return (
    <PageShell
      title="Features & prices"
      description="Credits per unit live in the catalog. Change a price here — no app redeploy."
    >
      {error ? <p className="text-red-700">{error}</p> : null}
      {prices.length === 0 && !error ? (
        <p className="text-slate-500">No features priced yet.</p>
      ) : null}
      <div className="space-y-4">
        {prices.map((price, idx) => (
          <Card key={price.featureKey}>
            <CardContent className="grid gap-3 pt-6 md:grid-cols-5">
              <Input
                value={price.featureKey}
                readOnly
                className="font-mono text-sm"
              />
              <Input
                value={price.name}
                onChange={(e) => {
                  const next = [...prices];
                  next[idx] = { ...price, name: e.target.value };
                  setPrices(next);
                }}
              />
              <Input
                type="number"
                step="0.01"
                value={price.creditsPerUnit}
                onChange={(e) => {
                  const next = [...prices];
                  next[idx] = { ...price, creditsPerUnit: Number(e.target.value) };
                  setPrices(next);
                }}
              />
              <Input
                value={price.unitLabel}
                onChange={(e) => {
                  const next = [...prices];
                  next[idx] = { ...price, unitLabel: e.target.value };
                  setPrices(next);
                }}
              />
              <Button onClick={() => save(price)} disabled={saving === price.featureKey}>
                {saving === price.featureKey ? "Saving…" : "Save"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
