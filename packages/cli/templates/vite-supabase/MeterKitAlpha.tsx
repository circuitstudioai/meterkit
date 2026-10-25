import { useState } from "react";
import { supabase } from "../lib/supabase";
import "./meterkit-alpha.css";

const featureCredits = __CREDITS__;
const packId = "__PACK_ID__";
const api = import.meta.env.VITE_METERKIT_ALPHA_API_URL as string | undefined;
export default function MeterKitAlpha() {
  const [workspace, setWorkspace] = useState(
    () => sessionStorage.getItem("meterkit-alpha-workspace") || "",
  );
  const [record, setRecord] = useState(
    () => sessionStorage.getItem("meterkit-alpha-record") || "",
  );
  const [wallet, setWallet] = useState<{
    available: number;
    held: number;
  } | null>(null);
  const [status, setStatus] = useState(
    "Connect your workspace to inspect its credit balance.",
  );
  const [result, setResult] = useState<{
    summary: string;
    citationIds: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const order = new URLSearchParams(location.search).get("token");
  async function request(path: string, data?: Record<string, unknown>) {
    if (!api || !supabase)
      throw new Error(
        "Alpha backend or sign-in is not configured. No credits were spent.",
      );
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session)
      throw new Error(
        "Sign in to Command Center first, then return to this page.",
      );
    sessionStorage.setItem("meterkit-alpha-workspace", workspace);
    sessionStorage.setItem("meterkit-alpha-record", record);
    const response = await fetch(
      `${api}/api/alpha${path}${data ? "" : `?workspaceId=${encodeURIComponent(workspace)}`}`,
      {
        method: data ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: data
          ? JSON.stringify({ ...data, workspaceId: workspace })
          : undefined,
      },
    );
    const payload = await response.json();
    if (!response.ok && payload.error === "work_failed")
      sessionStorage.removeItem(`meterkit-alpha-job:${workspace}:${record}`);
    if (!response.ok)
      throw new Error(
        payload.error === "insufficient_credits"
          ? "Not enough credits. Top up before generating an explanation."
          : `Request stopped: ${payload.error || response.status}`,
      );
    return payload;
  }
  async function act(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  const balance = async () => {
    const data = await request("/balance");
    setWallet(data);
  };
  return (
    <main className="mk-alpha">
      <nav>
        <a href="/">← Command Center</a>
        <span>MeterKit / isolated alpha</span>
      </nav>
      <header>
        <p className="mk-kicker">PAYPAL SANDBOX · NO REAL CHARGES</p>
        <h1>
          A clear explanation.
          <br />A visible credit trail.
        </h1>
        <p>
          Explain a confirmed Savings comparison. Existing calculations remain
          unchanged. AI explanations are estimates, not financial decisions.
        </p>
      </header>
      <div className="mk-grid">
        <section aria-labelledby="mk-workspace">
          <h2 id="mk-workspace">01 / Connect the evidence</h2>
          <label>
            Workspace ID
            <input
              value={workspace}
              onChange={(e) => {
                setWorkspace(e.target.value);
                setWallet(null);
                setResult(null);
              }}
              placeholder="Your alpha-enabled workspace UUID"
              disabled={busy}
            />
          </label>
          <label>
            Savings comparison ID
            <input
              value={record}
              onChange={(e) => {
                setRecord(e.target.value);
                setResult(null);
              }}
              placeholder="A confirmed comparison UUID"
              disabled={busy}
            />
          </label>
          <button
            disabled={busy || !workspace}
            onClick={() =>
              act(async () => {
                await balance();
                setStatus(
                  "Balance loaded. Only authorized workspaces can spend credits.",
                );
              })
            }
          >
            Check balance
          </button>
          <p className="mk-note">
            Uses your existing Command Center session. Workspace access and
            confirmed evidence are checked on the server.
          </p>
        </section>
        <section aria-labelledby="mk-wallet">
          <h2 id="mk-wallet">02 / Review the cost</h2>
          <div className="mk-balance">
            <strong>{wallet?.available ?? "—"}</strong>
            <span>available credits</span>
          </div>
          <p>{wallet?.held ?? "—"} credits held by unfinished work</p>
          <p>
            One explanation: <strong>{featureCredits} demo credits</strong>.
            Test pricing only.
          </p>
          <button
            disabled={busy || !workspace}
            onClick={() =>
              act(async () => {
                const data = await request("/paypal/orders", {
                  packId,
                  key: crypto.randomUUID(),
                });
                if (data.approvalUrl) location.assign(data.approvalUrl);
                else
                  setStatus(
                    "Order already exists. Confirm its approved capture.",
                  );
              })
            }
          >
            Add credits with PayPal sandbox
          </button>
          {order && (
            <button
              disabled={busy || !workspace}
              onClick={() =>
                act(async () => {
                  await request("/paypal/capture", { orderId: order });
                  await balance();
                  setStatus("Sandbox payment verified. Credits are available.");
                })
              }
            >
              Confirm approved top-up
            </button>
          )}
        </section>
      </div>
      <section className="mk-action">
        <div>
          <h2>03 / Generate the explanation</h2>
          <p>
            Confirmed failures release credits. Pending work keeps its
            reservation; retrying checks the same job.
          </p>
        </div>
        <button
          disabled={
            busy ||
            !workspace ||
            !record ||
            (wallet !== null &&
              wallet.available < featureCredits &&
              !sessionStorage.getItem(
                `meterkit-alpha-job:${workspace}:${record}`,
              ))
          }
          onClick={() =>
            act(async () => {
              const storageKey = `meterkit-alpha-job:${workspace}:${record}`;
              const key =
                sessionStorage.getItem(storageKey) || crypto.randomUUID();
              sessionStorage.setItem(storageKey, key);
              const data = await request("/jobs", {
                key,
                recordId: record,
                expectedCredits: featureCredits,
              });
              if (data.status === "completed") {
                setResult(data.result);
                setStatus(
                  "Explanation saved. Repeating this request will not charge again.",
                );
              } else
                setStatus(
                  "Work is pending. Credits remain held. Retry checks this job without starting another.",
                );
              await balance();
            })
          }
        >
          {busy ? "Checking…" : "Generate or retrieve explanation"}
        </button>
      </section>
      <p role="status" aria-live="polite" className="mk-status">
        {status}
      </p>
      {result && (
        <article className="mk-result">
          <p className="mk-kicker">AI EXPLANATION · REVIEW REQUIRED</p>
          <h2>Your saved explanation</h2>
          <p>{result.summary}</p>
          <p>Source comparison: {result.citationIds.join(", ")}</p>
          <small>
            No subscription was changed. No cancellation or purchase was made.
          </small>
        </article>
      )}
      <footer>
        Free inventory, manual governance, calculations and exports remain
        unchanged.
      </footer>
    </main>
  );
}
