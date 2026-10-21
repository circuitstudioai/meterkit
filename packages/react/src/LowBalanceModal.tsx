"use client";
import { useEffect, useId, useRef } from "react";
import { useWallet } from "./context";
import { TopUpButton } from "./TopUpButton";

export function LowBalanceModal({ amountUsd = 10 }: { amountUsd?: number }) {
  const { needsTopUp, setNeedsTopUp, balance } = useWallet();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const node = dialog.current;
    if (needsTopUp && node && !node.open) node.showModal();
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !node?.open) return;
      const controls = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = controls[0],
        last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        node.focus();
        return;
      }
      const outside = !node.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || outside)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    if (needsTopUp) document.addEventListener("keydown", trapTab, true);
    return () => {
      document.removeEventListener("keydown", trapTab, true);
      if (node?.open) node.close();
    };
  }, [needsTopUp]);
  if (!needsTopUp) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        setNeedsTopUp(false);
      }}
      style={{
        margin: "auto",
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        padding: 24,
        width: "min(420px, 92vw)",
        maxHeight: "85dvh",
        overflowY: "auto",
        overscrollBehavior: "contain",
        color: "#193c39",
        background: "white",
      }}
    >
      <h2 id={titleId} style={{ fontSize: 20, marginBottom: 8 }}>
        Add credits to keep going
      </h2>
      <p style={{ color: "#475569", marginBottom: 16 }}>
        You have {balance ?? 0} credits remaining. Add prepaid credits with
        PayPal. Venmo may be available at checkout.
      </p>
      <TopUpButton amountUsd={amountUsd} />
      <button
        type="button"
        onClick={() => setNeedsTopUp(false)}
        style={{ marginTop: 12, minHeight: 44, padding: "8px 12px" }}
      >
        Not now
      </button>
    </dialog>
  );
}
