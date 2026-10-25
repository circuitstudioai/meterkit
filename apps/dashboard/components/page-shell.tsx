import { Navigation } from "@/components/navigation";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="meter-shell">
      <Navigation />
      <main id="main-content" className="meter-main">
        <p className="mb-6 text-sm leading-6 text-slate-600">
          Sandbox only. Historical console pages use the legacy demo ledger, not
          the verified alpha backend. Only “Alpha wallet (read-only)” reads the
          authenticated alpha wallet; it is disabled by default.
        </p>
        <div className="meter-page-heading">
          <p className="meter-eyebrow">Your credit ledger</p>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-1 text-slate-600">{description}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}
