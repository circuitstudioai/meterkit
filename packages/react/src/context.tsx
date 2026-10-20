"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BRAND } from "@meterkit/config";

type WalletContextValue = {
  userId: string;
  balance: number | null;
  lowBalance: boolean;
  threshold: number;
  apiUrl: string;
  refresh: () => Promise<void>;
  setNeedsTopUp: (value: boolean) => void;
  needsTopUp: boolean;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({
  userId,
  apiUrl = "",
  threshold = 50,
  children,
}: {
  userId: string;
  apiUrl?: string;
  threshold?: number;
  children: React.ReactNode;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [needsTopUp, setNeedsTopUp] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(
      `${apiUrl}/api/meter/balance?userId=${encodeURIComponent(userId)}`
    );
    const data = (await res.json()) as { balance?: number };
    const next = data.balance ?? 0;
    setBalance(next);
    if (next <= threshold) {
      setNeedsTopUp(true);
    }
  }, [apiUrl, threshold, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      userId,
      balance,
      lowBalance: (balance ?? 0) <= threshold,
      threshold,
      apiUrl,
      refresh,
      needsTopUp,
      setNeedsTopUp,
    }),
    [apiUrl, balance, needsTopUp, refresh, threshold, userId]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error(`${BRAND.name} WalletProvider is missing`);
  }
  return ctx;
}
