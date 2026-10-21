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
