import { BRAND } from "@meterkit/config";
import { chatUiConfig } from "../lib/ui-config";
import SandboxChat from "./sandbox-chat";

// Evaluate deployment gates at request time, never freeze activation into a static build.
export const dynamic = "force-dynamic";
export default function ChatPage() {
  const config = chatUiConfig(process.env);
  return (
    <main className="chat-shell">
      <header><p className="eyebrow">Sandbox only · existing test accounts</p>
        <h1>{BRAND.name} sandbox chat</h1>
        <p>A verified account. A visible balance. One recoverable request at a time.</p>
      </header>
      {config ? <SandboxChat config={config} /> : <section aria-labelledby="unavailable">
        <h2 id="unavailable">Sandbox chat is unavailable</h2>
        <p>The authenticated sandbox chatbot is not ready for use on this deployment.</p>
        <p>No sign-in, purchase or AI action is available. The historical demo wallet, chat and export actions have been retired.</p>
        <p>Verified Auth and hosted acceptance remain required. Production payments remain disabled.</p>
      </section>}
      <footer>Purchases are unavailable on this page. Sandbox payments still require merchant configuration,
        a verified webhook and separate buyer approval. No Production payments.</footer>
    </main>
  );
}
