"use client";

import { useState, useEffect } from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { setEnabled, isEnabled, play } from "@/lib/audio";

export type AudioToggleSize = "rail" | "mini";

interface AudioToggleProps {
  size?: AudioToggleSize;
}

/**
 * Audio opt-in toggle. Off by default; persists to localStorage under
 * `holocron:audio_enabled`. Must be used from a user gesture to satisfy
 * browser autoplay policy — the AudioContext is constructed on the first click.
 *
 * Integration:
 *   - Desktop NavRail: place inside the bottom `<div>` alongside the Legends toggle.
 *   - Mobile mini-bar: place inside the trailing `<div>` alongside search/route/Legends.
 *   - Pass size="rail" for the 40×40 desktop icon button, size="mini" for the
 *     smaller 32px mobile variant (matches the search/route icon buttons).
 */
export function AudioToggle({ size = "rail" }: AudioToggleProps) {
  const [enabled, setEnabledState] = useState<boolean>(false);

  // Sync with persisted state on mount (SSR-safe — isEnabled() reads module var
  // which is populated from localStorage on module init in the browser).
  useEffect(() => {
    setEnabledState(isEnabled());
  }, []);

  function handleClick() {
    const next = !enabled;
    setEnabledState(next);
    // setEnabled must be called from a user gesture (this click handler qualifies).
    setEnabled(next);
    // Play 'select' only when turning ON — immediate feedback that audio works.
    if (next) {
      play("select");
    }
  }

  const iconSize = size === "rail" ? 16 : 14;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={enabled}
      aria-label={enabled ? "Audio on" : "Audio off"}
      title={enabled ? "Audio on" : "Audio off · A"}
      className={cn(
        "rounded-md border transition-colors",
        size === "rail"
          ? // Matches the Legends toggle: 40×40 with centered icon
            "flex h-10 w-10 items-center justify-center"
          : // Matches search/route icon buttons in the mobile mini-bar
            "p-2",
        enabled
          ? // Active: hairline accent border + accent background tint (mirrors Legends "on")
            "border-accent/50 bg-accent-bg/10 text-fg-strong"
          : // Inactive: faint border + muted text (mirrors Legends "off")
            "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary"
      )}
    >
      {enabled ? (
        <SpeakerHigh size={iconSize} weight="regular" />
      ) : (
        <SpeakerSlash size={iconSize} weight="regular" />
      )}
    </button>
  );
}
