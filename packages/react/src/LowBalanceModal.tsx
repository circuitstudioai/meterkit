"use client";

import { BRAND } from "@meterkit/config";
import { useWallet } from "./context";
import { TopUpButton } from "./TopUpButton";

export function LowBalanceModal({ amountUsd = 10 }: { amountUsd?: number }) {
  const { needsTopUp, setNeedsTopUp, balance, threshold } = useWallet();
  if (!needsTopUp) {
    return null;
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          width: "min(420px, 92vw)",
        }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Add credits to keep going</h2>
        <p style={{ color: "#475569", marginBottom: 16 }}>
          Your {BRAND.name} balance is {balance ?? 0} credits (threshold {threshold}).
          Top up with PayPal or Venmo — prepaid, pay-as-you-go.
        </p>
        <TopUpButton amountUsd={amountUsd} />
        <button type="button" onClick={() => setNeedsTopUp(false)} style={{ marginTop: 12 }}>
          Not now
        </button>
      </div>
    </div>
  );
}
