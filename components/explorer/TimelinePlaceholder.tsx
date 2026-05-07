export function TimelinePlaceholder() {
  return (
    <div className="grid h-full w-full place-items-center bg-bg-deep p-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">Timeline view</p>
        <p className="mt-3 text-base text-fg-primary/85">
          Faction territories morphing across 25,000 years. Event leaderlines tethering to the
          galaxy. Available in the next iteration.
        </p>
        <p className="mt-2 font-mono text-2xs text-fg-dim">Scrubber below is live.</p>
      </div>
    </div>
  );
}
