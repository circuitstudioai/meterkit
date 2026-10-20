"use client";

import { useState } from "react";
import { LowBalanceModal, TopUpButton, WalletBalance } from "@meterkit/react";
import { useWallet } from "@meterkit/react";
import { BRAND } from "@meterkit/config";

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { refresh, setNeedsTopUp } = useWallet();

  const send = async () => {
    setBusy(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, userId: "user_alex" }),
    });
    const data = await res.json();
    if (res.status === 402) {
      setNeedsTopUp(true);
      setLog((prev) => [...prev, "Bot: top up to keep chatting."]);
    } else {
      setLog((prev) => [...prev, `You: ${prompt}`, `Bot: ${data.text}`]);
    }
    setPrompt("");
    setBusy(false);
    await refresh();
  };

  const exportPdf = async () => {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Chat", body: log.join("\n"), userId: "user_alex" }),
    });
    if (res.status === 402) {
      setNeedsTopUp(true);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat.pdf";
    a.click();
    await refresh();
  };

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>{BRAND.name} chat</h1>
        <WalletBalance />
      </header>
      <p>After init: each message and PDF export debits the prepaid wallet.</p>
      <TopUpButton amountUsd={10} />
      <div style={{ minHeight: 200, border: "1px solid #e2e8f0", padding: 12, margin: "12px 0" }}>
        {log.length === 0 ? <p>No messages yet.</p> : log.map((line) => <p key={line}>{line}</p>)}
      </div>
      <input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Ask something"
        style={{ width: "70%", padding: 8 }}
      />
      <button type="button" onClick={send} disabled={busy} style={{ marginLeft: 8 }}>
        Send
      </button>
      <button type="button" onClick={exportPdf} style={{ marginLeft: 8 }}>
        Export PDF
      </button>
      <LowBalanceModal />
    </main>
  );
}
