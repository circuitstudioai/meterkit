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
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const id = clientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!id || !host.current) {
      setFallback(true);
      return;
    }

    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      id,
    )}&currency=USD&components=buttons&enable-funding=venmo&intent=capture`;

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://www.paypal.com/sdk/js"]`,
    );
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
            const data = (await res.json()) as {
              orderId?: string;
              error?: string;
            };
            if (!data.orderId) {
              throw new Error(data.error || "Could not create PayPal order");
            }
            return data.orderId;
          },
          onApprove: async (data) => {
            const capture = await fetch(`${apiUrl}/api/paypal/capture`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: data.orderID,
                userId,
                amount: amountUsd,
              }),
            });
            if (!capture.ok) {
              setError(
                "Payment was not confirmed. Check the transaction history before trying again.",
              );
              return;
            }
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
    setError("");
    setPending(true);
    try {
      const response = await fetch(`${apiUrl}/api/paypal/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountUsd, userId }),
      });
      const data = (await response.json()) as { approveUrl?: string };
      if (!response.ok || !data.approveUrl)
        throw new Error("Checkout unavailable");
      window.location.assign(data.approveUrl);
    } catch {
      setError(
        "Could not open PayPal checkout. Check the connection or ask the app owner to check payment setup.",
      );
      setPending(false);
    }
  };

  return (
    <div>
      <div ref={host} />
      {fallback ? (
        <button
          type="button"
          onClick={redirectTopUp}
          disabled={pending}
          style={{ minHeight: 44, padding: "8px 12px" }}
        >
          {pending
            ? "Opening PayPal…"
            : label || `Top up $${amountUsd} with PayPal`}
        </button>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <p>{BRAND.settlementNote}</p>
    </div>
  );
}
