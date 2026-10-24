import { BRAND } from "@meterkit/config";

export default function ChatPage() {
  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h1>{BRAND.name} sandbox chat</h1>
      <p>The authenticated sandbox chatbot is not ready for use.</p>
      <p>
        The historical demo wallet, chat and export actions have been retired.
        No sign-in, purchase or AI action is available on this page.
      </p>
      <p>
        Verified sign-in and the alpha-backed wallet interface are still pending.
        Sandbox payments also require merchant configuration, a verified webhook
        and separate buyer approval. Production payments remain disabled.
      </p>
    </main>
  );
}
