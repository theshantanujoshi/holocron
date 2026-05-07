export function LineagePlaceholder() {
  return (
    <div className="grid h-full w-full place-items-center bg-bg-deep p-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">Lineage view</p>
        <p className="mt-3 text-base text-fg-primary/85">
          Master and apprentice tree, parent and child relations, faction membership over time.
          Available in the next iteration.
        </p>
        <p className="mt-2 font-mono text-2xs text-fg-dim">
          Lineage data ingestion is part of the same milestone.
        </p>
      </div>
    </div>
  );
}
