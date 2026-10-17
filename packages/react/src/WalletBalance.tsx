"use client";

import { BRAND } from "@meterkit/config";
import { useWallet } from "./context";

export function WalletBalance({ className }: { className?: string }) {
  const { balance } = useWallet();
  return (
    <span className={className}>
      {BRAND.name} · {balance == null ? "…" : `${Math.round(balance)} credits`}
    </span>
  );
}
