"use client";

import { useSyncExternalStore } from "react";
import { SCENE_COUNT } from "./scenes";

/**
 * Bridge between DOM (GSAP/ScrollTrigger) and WebGL (R3F).
 * Mutable on purpose: read it inside useFrame — never trigger React renders per frame.
 */
export const sceneState = {
  progress: 0, // 0..1 across the whole page
  active: 0, // index of the scene currently centred in the viewport
  local: Array.from({ length: SCENE_COUNT }, () => 0), // 0..1 as each section passes through the viewport
};

const listeners = new Set<() => void>();

export function setActiveScene(i: number) {
  if (sceneState.active === i) return;
  sceneState.active = i;
  listeners.forEach((l) => l());
}

/** React hook for the (rare) cases a component should re-render on scene change. */
export function useActiveScene() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => sceneState.active,
    () => 0
  );
}
