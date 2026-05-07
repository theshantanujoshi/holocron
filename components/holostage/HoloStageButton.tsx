"use client";

import { UserCircle } from "@phosphor-icons/react";
import { useSelection } from "@/lib/store";

/**
 * <HoloStageButton /> — Datapad-header trigger for the cinematic holo-stage.
 *
 * Person entities only. Sits between the existing pivot buttons and the
 * canon/Legends chip in the Datapad header. 7×7, accent-tinted to advertise
 * the new mode without looking like a destructive action.
 */
export function HoloStageButton() {
  const setHoloStage = useSelection((s) => s.setHoloStage);
  return (
    <button
      type="button"
      onClick={() => setHoloStage(true)}
      aria-label="View hologram"
      title="View hologram"
      className="flex h-7 w-7 items-center justify-center rounded border border-accent-faint bg-accent-bg/40 text-accent transition-colors hover:border-accent hover:bg-accent-bg/60 hover:text-accent-strong"
    >
      <UserCircle size={13} weight="regular" />
    </button>
  );
}
