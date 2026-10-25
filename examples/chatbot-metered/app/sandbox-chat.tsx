"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatClientError, createAlphaClient, createTabRecoveryStore, type ChatJob } from "../lib/alpha-client";
import type { ChatUiConfig } from "../lib/ui-config";

type Client = ReturnType<typeof createAlphaClient>;
const messages: Record<string, string> = {
  sign_in_failed: "Sign-in failed. Check your test account details and try again.",
  sign_in_required: "Your session has ended. Sign in again. Any pending request is kept for its original account.",
  balance_unavailable: "Balance could not be verified. Check it again before starting new work.",
  recovery_unavailable: "Tab recovery is unavailable. Actions are blocked. Do not clear tab data to bypass pending work; ask the operator to investigate.",
  pending_job_exists: "A request already needs recovery. Sign in with its original account and check that request first.",
  job_needs_reconciliation: "The outcome is unknown. Check the pending request; do not create a replacement or assume a refund.",
  invalid_prompt: "Enter a prompt of 1–4,000 characters.",
  session_changed: "The session changed. Sign in again to continue.",
};
export default function SandboxChat({ config }: { config: ChatUiConfig }) {
  const client = useRef<Client | null>(null);
  const [consent, setConsent] = useState(false), [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false), [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false), [pending, setPending] = useState<ChatJob>();
  const [hasPending, setHasPending] = useState(false);
  const [balance, setBalance] = useState<{ available: number; held: number }>();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState(""), [notice, setNotice] = useState(""), [error, setError] = useState("");
  // Hide account-bound content when a memory-only session expires, even without another click.
  useEffect(() => {
    if (!signedIn) return;
    const timer = setInterval(() => {
      const c = client.current;
      if (c && !c.hasSession()) {
        c.signOut(); setSignedIn(false); setPending(undefined); setBalance(undefined);
        setAnswer(""); setPrompt(""); setNotice(""); setError(messages.sign_in_required);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [signedIn]);
  function sync() {
    const c = client.current;
    setSignedIn(c?.hasSession() ?? false);
    setPending(c?.pendingJob()); setHasPending(c?.hasPendingJob() ?? false);
    if (!c?.hasSession()) { setBalance(undefined); setAnswer(""); setPrompt(""); }
  }
  function begin() {
    if (!consent || blocked || ready) return;
    try {
      if (location.origin !== config.origin) throw new ChatClientError("recovery_unavailable");
      client.current = createAlphaClient({ issuer: config.issuer, anonKey: config.anonKey,
        recovery: createTabRecoveryStore(window.sessionStorage, config.appId) });
      setReady(true); sync(); setNotice("Sign in with an existing sandbox test account. No request runs automatically.");
    } catch { setBlocked(true); setError(messages.recovery_unavailable); }
  }
  async function run(action: () => Promise<void>) {
    if (busy || blocked || !client.current) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (e) {
      const code = e instanceof ChatClientError ? e.code : "request_failed";
      setError(messages[code] ?? "The request failed. Check the pending request before starting new work.");
      if (code === "recovery_unavailable") setBlocked(true);
      setBalance(undefined);
    } finally { sync(); setBusy(false); }
  }
  async function checkBalance() {
    setBalance(await client.current!.balance());
    setNotice("Balance verified. Held credits are not available to spend.");
  }
  function login(event: FormEvent) {
    event.preventDefault();
    const secret = password;
    setPassword(""); setAnswer(""); setBalance(undefined); setPrompt("");
    void run(async () => { await client.current!.signIn(email.trim(), secret); await checkBalance(); });
  }
  function logout() {
    client.current?.signOut(); setEmail(""); setPassword(""); setError(""); sync();
    setNotice("Signed out locally. This does not revoke other sessions. Pending work remains bound to its original account.");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void job(false);
  }
  async function job(recover: boolean) {
    setAnswer("");
    await run(async () => {
      const result = recover ? await client.current!.reconcile() : await client.current!.send(prompt);
      if (result.status === "completed") {
        setAnswer(result.text); setPrompt(""); setNotice("Request completed. Five credits settled once; recovery information cleared.");
      } else if (result.status === "released") {
        setPrompt(""); setNotice("The server confirmed failure and released the hold. No answer was produced.");
      } else setNotice("The request is still pending. Its hold remains; check the same request later. No automatic retry or refund.");
      // A failed balance refresh must not discard a confirmed answer or completion notice.
      try { setBalance(await client.current!.balance()); }
      catch (e) {
        setBalance(undefined);
        if (e instanceof ChatClientError && e.code === "sign_in_required") throw e;
        setError(messages.balance_unavailable);
      }
    });
  }
  return <>
    <section aria-labelledby="recovery-title">
      <h2 id="recovery-title">Before you sign in</h2>
      <p>Your pending prompt and request identifiers are saved in this tab until completion or confirmed failure.
        Passwords, session tokens and answers are not saved. Reload signs you out, but keeps pending work.</p>
      <p>Use synthetic test prompts only. Tab storage is not encrypted. Closing the tab or clearing browser data can lose recovery information;
        an unknown outcome then needs operator investigation. Never blindly rerun it.</p>
      {!ready && <><label className="consent"><input type="checkbox" checked={consent} disabled={blocked}
        onChange={e => setConsent(e.target.checked)} /> I understand pending-prompt retention in this tab.</label>
        <button disabled={!consent || blocked} onClick={begin}>Continue to sandbox sign-in</button></>}
    </section>
    {error && <p role="alert" className="error">{error}</p>}
    {notice && <p role="status" className="notice">{notice}</p>}
    {ready && !signedIn && <section aria-labelledby="signin-title"><h2 id="signin-title">Sign in to your test account</h2>
      <p>Existing accounts only. No signup, password reset or persistent session is provided here.</p>
      {hasPending && <p>A request needs recovery. Sign in with its original account to see it. No new job will run first.</p>}
      <form onSubmit={login}><label>Email<input type="email" autoComplete="username" value={email}
        onChange={e => setEmail(e.target.value)} required disabled={busy || blocked} /></label>
        <label>Password<input type="password" autoComplete="off" value={password}
          onChange={e => setPassword(e.target.value)} required disabled={busy || blocked} /></label>
        <button disabled={busy || blocked}>Sign in</button></form>
    </section>}
    {ready && signedIn && <>
      <section aria-labelledby="balance-title"><h2 id="balance-title">Your sandbox credits</h2>
        <p>{balance ? <><strong>{balance.available}</strong> available · <strong>{balance.held}</strong> held</> : "Balance not verified."}</p>
        <div className="actions"><button disabled={busy || blocked} onClick={() => void run(checkBalance)}>Check balance</button>
          <button disabled={busy} onClick={logout}>Sign out locally</button></div>
      </section>
      {hasPending ? <section aria-labelledby="pending-title"><h2 id="pending-title">A request needs recovery</h2>
        {pending ? <><p>Check the original request using the same input and key. A pending result is not a refund.</p>
          <details><summary>Review your pending prompt and request</summary><p className="response">{pending.prompt}</p>
            <p className="request-id">Request: {pending.key}</p></details>
          <button disabled={busy || blocked} onClick={() => void job(true)}>Check pending request</button></>
          : <p>Sign out and use the original account. This account cannot view or replay the pending prompt.</p>}
      </section> : <section aria-labelledby="prompt-title"><h2 id="prompt-title">Ask a sandbox question</h2>
        <p>Each new AI action costs 5 credits. A held or uncertain request must be recovered before new work.</p>
        <form onSubmit={submit}><label>Prompt<textarea maxLength={4000} rows={5} value={prompt}
          onChange={e => setPrompt(e.target.value)} disabled={busy || blocked} required /></label>
          <button disabled={busy || blocked || !balance || balance.available < 5 || !prompt.trim()}>Send for 5 credits</button></form>
        {balance && balance.available < 5 && <p>Not enough available credits. Purchases are not available on this page.</p>}
      </section>}
      {answer && <section aria-labelledby="answer-title"><h2 id="answer-title">Your answer</h2><p className="response">{answer}</p></section>}
    </>}
    {busy && <p role="status">Request in progress. Do not close or clear this tab.</p>}
  </>;
}
