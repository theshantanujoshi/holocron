"use client";

import { create } from "zustand";
import type { EntityType } from "./schema";

export type ViewMode = "galaxy" | "timeline" | "lineage";

export type RouteMode = "idle" | "picking-origin" | "picking-destination" | "shown";

export type RouteState = {
  mode: RouteMode;
  originId: string | null;
  destinationId: string | null;
};

export type SelectionState = {
  entityId: string | null;
  entityType: EntityType | null;
  era: number;
  view: ViewMode;
  showLegends: boolean;
  atlasMode: boolean;
  searchOpen: boolean;
  pivoting: boolean;
  holoStage: boolean;
  route: RouteState;
};

type SelectionActions = {
  select: (id: string, type: EntityType) => void;
  clearSelection: () => void;
  setEra: (year: number) => void;
  setView: (view: ViewMode) => void;
  toggleLegends: () => void;
  toggleAtlas: () => void;
  setSearchOpen: (open: boolean) => void;
  setPivoting: (pivoting: boolean) => void;
  setHoloStage: (open: boolean) => void;
  startRoute: () => void;
  pickEndpoint: (planetId: string) => void;
  clearRoute: () => void;
  reverseRoute: () => void;
};

const INITIAL_ROUTE: RouteState = {
  mode: "idle",
  originId: null,
  destinationId: null
};

const INITIAL: SelectionState = {
  entityId: null,
  entityType: null,
  era: 0,
  view: "galaxy",
  showLegends: false,
  atlasMode: false,
  searchOpen: false,
  pivoting: false,
  holoStage: false,
  route: INITIAL_ROUTE
};

export const useSelection = create<SelectionState & SelectionActions>((set) => ({
  ...INITIAL,
  select: (id, type) => set({ entityId: id, entityType: type, pivoting: true }),
  clearSelection: () => set({ entityId: null, entityType: null, pivoting: false }),
  setEra: (year) => set({ era: year }),
  setView: (view) => set({ view, pivoting: true }),
  toggleLegends: () => set((s) => ({ showLegends: !s.showLegends })),
  toggleAtlas: () => set((s) => ({ atlasMode: !s.atlasMode })),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setPivoting: (pivoting) => set({ pivoting }),
  setHoloStage: (open) => set({ holoStage: open }),
  startRoute: () =>
    set({
      route: { mode: "picking-origin", originId: null, destinationId: null }
    }),
  pickEndpoint: (planetId) =>
    set((s) => {
      const { mode, originId } = s.route;
      if (mode === "picking-origin") {
        return {
          route: { mode: "picking-destination", originId: planetId, destinationId: null }
        };
      }
      if (mode === "picking-destination") {
        if (planetId === originId) return s; // ignore self-pick
        return {
          route: { mode: "shown", originId, destinationId: planetId }
        };
      }
      return s;
    }),
  clearRoute: () => set({ route: { ...INITIAL_ROUTE } }),
  reverseRoute: () =>
    set((s) => {
      const { mode, originId, destinationId } = s.route;
      if (mode !== "shown" || !originId || !destinationId) return s;
      return {
        route: { mode: "shown", originId: destinationId, destinationId: originId }
      };
    })
}));
