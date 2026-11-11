import { useSyncExternalStore } from "react";

/**
 * Scene 01 ↔ WebGL bridge. Mutable by design: GSAP writes, useFrame reads.
 * Never put these values in React state.
 */
export const heroState = {
  ready: false, // portrait texture uploaded → intro may start
  reveal: 0, // 0..1  light spreads out from the cybernetic eye
  eye: 0, // 0..1  eye ignition
  scan: 0, // 0..1  position of the red scan band
  scanAmp: 1, // scan intensity (full on intro, subtle on repeats)
  intro: 0, // 0..1  slow cinematic push-in (≈10 s)
  scroll: 0, // 0..1  raw progress through the hero scroll space
  mx: 0, // pointer target  -1..1
  my: 0,
  sx: 0, // smoothed pointer (written by the scene)
  sy: 0,
  textH: 0, // px height of the bottom text stack (name, title, headline, CTA), measured by the hero section
};

const layoutListeners = new Set<() => void>();

/** The hero section reports how tall its text stack is, so the portrait can be fitted ABOVE it (never under the face). */
export function setHeroTextHeight(h: number) {
  const v = Math.round(h);
  if (heroState.textH === v) return;
  heroState.textH = v;
  layoutListeners.forEach((l) => l());
}

export const useHeroTextHeight = () =>
  useSyncExternalStore(
    (cb) => {
      layoutListeners.add(cb);
      return () => { layoutListeners.delete(cb); };
    },
    () => heroState.textH,
    () => 0
  );

const readyListeners = new Set<() => void>();

export function setHeroReady() {
  if (heroState.ready) return;
  heroState.ready = true;
  readyListeners.forEach((l) => l());
  readyListeners.clear();
}

export function onHeroReady(cb: () => void) {
  if (heroState.ready) {
    cb();
    return () => {};
  }
  readyListeners.add(cb);
  return () => {
    readyListeners.delete(cb);
  };
}

export function resetHeroState() {
  heroState.reveal = 0;
  heroState.eye = 0;
  heroState.scan = 0;
  heroState.scanAmp = 1;
  heroState.intro = 0;
  heroState.scroll = 0;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Dissolve progress used by portrait, particles and shards. Starts after a short hold. */
export const heroExit = () => smooth(0.1, 0.92, heroState.scroll);
