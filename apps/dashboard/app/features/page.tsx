"use client";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LoadState } from "@/components/load-state";
import { requestJson } from "@/lib/use-resource";
type Price = {
  featureKey: string;
  name: string;
  creditsPerUnit: number;
  unitLabel: string;
};
export default function FeaturesPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [dirty, setDirty] = useState<string[]>([]);
  useEffect(() => {
    if (!dirty.length) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !link ||
        link.target === "_blank" ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      const target = new URL(link.href);
      if (
        target.origin === location.origin &&
        target.pathname === location.pathname &&
        target.search === location.search
      )
        return;
      if (!window.confirm("Leave without saving your feature prices?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  const load = () =>
    requestJson<{ prices: Price[] }>("/api/meter/prices")
      .then((data) => {
        setPrices(data.prices);
        setError("");
      })
      .catch(() =>
        setError(
          "Could not load feature prices. Check your connection and try again.",
        ),
      )
      .finally(() => setLoading(false));
  useEffect(() => {
    void load();
  }, []);
  const save = async (price: Price) => {
    setError("");
    setMessage("");
    if (
      !price.name.trim() ||
      !price.unitLabel.trim() ||
      !Number.isFinite(price.creditsPerUnit) ||
      price.creditsPerUnit < 0
    ) {
      setError(
        "Enter a feature name, unit, and a price of zero or more credits.",
      );
      return;
    }
    setSaving(price.featureKey);
    try {
      await requestJson("/api/meter/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(price),
      });
      setMessage(`Price saved for ${price.name}.`);
      setDirty((previous) =>
        previous.filter((key) => key !== price.featureKey),
      );
    } catch {
      setError(
        "Could not save this price. Your edits are still here. Try saving again.",
      );
    } finally {
      setSaving("");
    }
  };
  const update = (index: number, patch: Partial<Price>) => {
    setDirty((previous) => [
      ...new Set([...previous, prices[index].featureKey]),
    ]);
    setPrices((previous) =>
      previous.map((price, i) =>
        i === index ? { ...price, ...patch } : price,
      ),
    );
  };
  return (
    <PageShell
      title="Features & prices"
      description="Set the credits charged for each unit of a feature. Saved prices apply without redeploying your app."
    >
      <LoadState
        loading={loading}
        error={prices.length ? "" : error}
        retry={() => void load()}
      />
      {error && prices.length > 0 && (
        <p role="alert" className="mb-4 text-sm text-red-800">
          {error}
        </p>
      )}
      <p role="status" className="mb-4 text-sm text-green-800">
        {message}
      </p>
      {!loading && !error && prices.length === 0 && (
        <p className="meter-empty">
          No prices yet. The demo setup includes chat messages and PDF exports.
        </p>
      )}
      <div className="space-y-4">
        {prices.map((price, index) => (
          <Card key={price.featureKey}>
            <CardContent className="pt-6">
              <form
                className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save(price);
                }}
              >
                <label className="meter-field">
                  Feature key
                  <Input
                    value={price.featureKey}
                    readOnly
                    name="featureKey"
                    className="font-mono text-xs"
                  />
                </label>
                <label className="meter-field">
                  Feature name
                  <Input
                    name="featureName"
                    value={price.name}
                    required
                    onChange={(event) =>
                      update(index, { name: event.target.value })
                    }
                  />
                </label>
                <label className="meter-field">
                  Credits per unit
                  <Input
                    name="credits"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={price.creditsPerUnit}
                    onChange={(event) =>
                      update(index, {
                        creditsPerUnit: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="meter-field">
                  Unit name
                  <Input
                    name="unit"
                    required
                    value={price.unitLabel}
                    onChange={(event) =>
                      update(index, { unitLabel: event.target.value })
                    }
                  />
                </label>
                <Button
                  type="submit"
                  disabled={Boolean(saving)}
                  aria-label={`Save price for ${price.name}`}
                >
                  {saving === price.featureKey ? "Saving…" : "Save price"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
