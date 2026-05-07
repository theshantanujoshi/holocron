import Link from "next/link";

export default function ExploreNotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-bg-canvas px-6">
      <div className="max-w-lg">
        <p className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
          Knowledge base not built
        </p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight text-fg-strong">
          The archive is empty.
        </h1>
        <p className="mt-3 text-base text-fg-primary/85">
          Run the data pipeline to ingest entities from public sources, then return here.
        </p>
        <pre className="mt-4 rounded-lg border border-border-faint bg-bg-panel/50 px-4 py-3 font-mono text-xs text-fg-primary">
          npm run build:kb
        </pre>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-fg-primary"
        >
          ← Back to landing
        </Link>
      </div>
    </main>
  );
}
