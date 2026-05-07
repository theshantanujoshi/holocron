"use client";

import { Users } from "@phosphor-icons/react";
import { useSelection } from "@/lib/store";
import { cn } from "@/lib/utils";

type Props = {
  /** "rail" = desktop vertical nav rail (40×40 square button, mono caption);
   *  "mini" = mobile horizontal bar (compact pill variant). */
  size?: "rail" | "mini";
};

/**
 * <AtlasToggle /> — toggles atlas mode on/off.
 *
 * Visual language mirrors the Legends toggle in NavRail:
 *   - 1px hairline border
 *   - Mono uppercase label "ATLAS" + on/off subtext (rail) or inline label (mini)
 *   - accent-bg/40 tint + accent border when on
 *   - Phosphor `Users` icon (a group of figures, weight="regular")
 *
 * Accessibility:
 *   - aria-pressed reflects the current on/off state
 *   - aria-label describes the action in plain English
 *   - Keyboard: natural tab stop, Space/Enter activates (button default)
 */
export function AtlasToggle({ size = "rail" }: Props) {
  const atlasMode = useSelection((s) => s.atlasMode);
  const toggleAtlas = useSelection((s) => s.toggleAtlas);

  const label = atlasMode ? "Atlas mode on" : "Atlas mode off";

  if (size === "rail") {
    return (
      <button
        type="button"
        onClick={toggleAtlas}
        aria-pressed={atlasMode}
        aria-label={label}
        title={label}
        className={cn(
          "flex h-10 w-10 flex-col items-center justify-center rounded-md border font-mono text-2xs uppercase tracking-[0.06em] transition-colors",
          atlasMode
            ? "border-accent/50 bg-accent-bg/40 text-accent"
            : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary",
        )}
      >
        <Users size={14} weight="regular" />
        <span className="mt-0.5 text-[8px] tracking-[0.18em]">
          {atlasMode ? "on" : "off"}
        </span>
      </button>
    );
  }

  // Mini variant — compact pill for mobile horizontal bar
  return (
    <button
      type="button"
      onClick={toggleAtlas}
      aria-pressed={atlasMode}
      aria-label={label}
      className={cn(
        "flex items-center gap-1 rounded-md border px-2 py-1.5 font-mono text-2xs uppercase tracking-[0.08em] transition-colors",
        atlasMode
          ? "border-accent/50 bg-accent-bg/40 text-accent"
          : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary",
      )}
    >
      <Users size={12} weight="regular" />
      <span>{atlasMode ? "Atlas on" : "Atlas"}</span>
    </button>
  );
}
