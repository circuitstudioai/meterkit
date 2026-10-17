"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND } from "@meterkit/config";
import { useWallet } from "./context";

type PaypalNamespace = {
  Buttons: (opts: {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError?: (err: Error) => void;
  }) => { render: (el: HTMLElement) => Promise<void> };
};

declare global {
  interface Window {
    paypal?: PaypalNamespace;
  }
}

export function TopUpButton({
  amountUsd = 10,
  clientId,
  label,
}: {
  amountUsd?: number;
  clientId?: string;
  label?: string;
}) {
  const { userId, apiUrl, refresh } = useWallet();
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = clientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!id || !host.current) {
      setFallback(true);
      return;
    }

    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      id
    )}&currency=USD&components=buttons&enable-funding=venmo&intent=capture`;

    const existing = document.querySelector<HTMLScriptElement>(`script[src^="https://www.paypal.com/sdk/js"]`);
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }

    const render = () => {
      if (!window.paypal || !host.current) {
        setFallback(true);
        return;
      }
      host.current.innerHTML = "";
      void window.paypal
        .Buttons({
          createOrder: async () => {
            const res = await fetch(`${apiUrl}/api/paypal/create-order`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ amount: amountUsd, userId }),
            });
            const data = (await res.json()) as { orderId?: string; error?: string };
            if (!data.orderId) {
              throw new Error(data.error || "Could not create PayPal order");
            }
            return data.orderId;
          },
          onApprove: async (data) => {
            await fetch(`${apiUrl}/api/paypal/capture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID, userId, amount: amountUsd }),
            });
            await refresh();
          },
          onError: (err) => setError(err.message),
        })
        .render(host.current);
    };

    if (window.paypal) {
      render();
    } else {
      script.addEventListener("load", render);
    }
  }, [amountUsd, apiUrl, clientId, refresh, userId]);

  const redirectTopUp = async () => {
    const res = await fetch(`${apiUrl}/api/paypal/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountUsd, userId }),
    });
    const data = (await res.json()) as { approveUrl?: string; error?: string };
    if (data.approveUrl) {
      window.location.href = data.approveUrl;
      return;
    }
    setError(data.error || "PayPal sandbox is not configured.");
  };

  return (
    <div>
      <div ref={host} />
      {fallback ? (
        <button type="button" onClick={redirectTopUp}>
          {label || `Top up $${amountUsd} with PayPal`}
        </button>
      ) : null}
      {error ? <p>{error}</p> : null}
      <p>{BRAND.settlementNote}</p>
    </div>
  );
}
