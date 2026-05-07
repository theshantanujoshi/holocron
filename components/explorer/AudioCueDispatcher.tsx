"use client";

import { useEffect, useRef } from "react";
import { useSelection } from "@/lib/store";
import { play, startAmbient, stopAmbient } from "@/lib/audio";

/**
 * Single subscriber that translates store transitions into audio cues.
 *
 * Mounted once in AppShell. Skips its first run so we never fire a cue on
 * initial hydration. Audio is no-op when the user has not opted in via the
 * AudioToggle, so calling `play(...)` here is always safe.
 */
export function AudioCueDispatcher() {
  const view = useSelection((s) => s.view);
  const searchOpen = useSelection((s) => s.searchOpen);
  const routeMode = useSelection((s) => s.route.mode);
  const entityId = useSelection((s) => s.entityId);

  const mounted = useRef(false);
  const prev = useRef({ view, searchOpen, routeMode, entityId });

  useEffect(() => {
    startAmbient();
    return () => stopAmbient();
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prev.current = { view, searchOpen, routeMode, entityId };
      return;
    }
    const p = prev.current;
    if (view !== p.view) play("pivot");
    if (searchOpen !== p.searchOpen) play(searchOpen ? "open" : "close");
    if (routeMode !== p.routeMode) {
      if (routeMode === "picking-origin" || routeMode === "picking-destination") play("tick");
      else if (routeMode === "shown") play("route");
    }
    if (entityId !== p.entityId && entityId) play("select");
    prev.current = { view, searchOpen, routeMode, entityId };
  }, [view, searchOpen, routeMode, entityId]);

  return null;
}
