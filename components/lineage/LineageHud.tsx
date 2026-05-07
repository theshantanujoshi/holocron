"use client";

type Props = {
  nodeCount: number;
  edgeCount: number;
  onShowFallback: () => void;
  fallbackOpen: boolean;
};

/**
 * Corner HUD labels for the lineage view. Mirrors the galaxy view's CornerHud
 * — same typography, same tracking, same fg-dim color, same absolute corners.
 *
 * The fallback toggle uses pointer-events-auto on the button only; everything
 * else stays click-through so the underlying graph still receives orbit
 * gestures.
 */
export function LineageHud({ nodeCount, edgeCount, onShowFallback, fallbackOpen }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-4 top-4 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Lineage view
      </div>
      <div className="absolute right-4 top-4 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        {nodeCount} nodes &middot; {edgeCount} edges
      </div>
      <div className="absolute bottom-4 left-4 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Click a node to pivot &middot; hover for path
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        <span>Master/apprentice &middot; Family &middot; Sith</span>
        <button
          type="button"
          onClick={onShowFallback}
          className="pointer-events-auto rounded-sm border border-border-faint px-2 py-1 transition-colors hover:border-border-line hover:text-fg-primary"
          aria-pressed={fallbackOpen}
          aria-label={fallbackOpen ? "Hide lineage text fallback" : "Show lineage text fallback"}
        >
          {fallbackOpen ? "Hide list" : "Show list"}
        </button>
      </div>
    </div>
  );
}
