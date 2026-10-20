"use client";

import { useState } from "react";

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, userId: "user_alex" }),
    });
    const data = await res.json();
    setLog((prev) => [...prev, `You: ${prompt}`, `Bot: ${data.text}`]);
    setPrompt("");
    setBusy(false);
  };

  const exportPdf = async () => {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Chat", body: log.join("\n") }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat.pdf";
    a.click();
  };

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h1>Northwind Chat</h1>
      <p>Before {`MeterKit`}: every Gemini call and PDF export is free to the end user (you eat the cost).</p>
      <div style={{ minHeight: 200, border: "1px solid #e2e8f0", padding: 12, marginBottom: 12 }}>
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
    </main>
  );
}
