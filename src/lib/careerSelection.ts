"use client";

import { useSyncExternalStore } from "react";
import { careerState } from "./careerState";

/**
 * Career selection store — the single source of truth for "which entry is focused".
 * Framework-agnostic and independent of any 3D component: DOM controls call `selectCareer`,
 * WebGL reads `careerState.active` inside useFrame (kept in sync here). The scroll stage can drive
 * the same `selectCareer` so both input paths stay consistent.
 */
let count = 1;
const listeners = new Set<() => void>();

export function setCareerCount(n: number) {
  count = Math.max(1, n);
}

export function selectCareer(i: number) {
  const next = Math.min(count - 1, Math.max(0, Math.round(i)));
  if (next === careerState.active) return;
  careerState.active = next;
  listeners.forEach((l) => l());
}

export function useCareerSelection(total: number) {
  setCareerCount(total);
  const index = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => careerState.active,
    () => 0
  );
  return {
    index: Math.min(index, total - 1),
    select: selectCareer,
    prev: () => selectCareer(index - 1),
    next: () => selectCareer(index + 1),
  };
}
