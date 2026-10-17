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
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-slate-600">{description}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
