"use client";
import { useSyncExternalStore } from "react";
import { TECH_CATEGORIES, TECH_COUNT, relatedIds } from "@/data/technologies";
import { GROUP_COUNT } from "@/data/neuralNetwork";
import { INTRO_VIEW, PHASE_COUNT, type ViewPose } from "@/data/techStages";

/**
 * Scene 05 ↔ WebGL bridge. GSAP writes, `useFrame` reads. Not React state — nothing here re-renders per frame.
 */
export interface TechSceneState {
  /** 0→1 as the section arrives (drives the camera hand-over from the previous scene). */
  enter: number;
  /** 0→1 across the pinned timeline. */
  progress: number;
  /** Growth of each channel (root, frontend, backend, data, tools, integrations), 0→1. */
  grow: number[];
  /** Energy-pulse intensity travelling along the connections. */
  pulse: number;
  /** Whole-network illumination for the final composition. */
  final: number;
  /** Camera framing (see PHASE_VIEWS). Tweened by the scroll timeline. */
  view: ViewPose;
  /** Written by the canvas each frame for the HTML hotspot layer: NDC position and diameter (CSS px) of every logo node. */
  screen: { x: number; y: number; d: number; on: number }[];
  /** Same for the five category hubs (label anchors). */
  hubScreen: { x: number; y: number; on: number }[];
  /** Live counters for the HUD. */
  online: { nodes: number; links: number; nodesTotal: number; linksTotal: number };
  /** Logo scale factor chosen by the camera rig (keeps logos legible when the camera is far). */
  logoScale: number;
  reduced: boolean;
}

export const techState: TechSceneState = {
  enter: 0,
  progress: 0,
  grow: Array(GROUP_COUNT).fill(0),
  pulse: 0,
  final: 0,
  view: { ...INTRO_VIEW },
  screen: Array.from({ length: TECH_COUNT }, () => ({ x: 0, y: 0, d: 0, on: 0 })),
  hubScreen: Array.from({ length: TECH_CATEGORIES.length }, () => ({ x: 0, y: 0, on: 0 })),
  online: { nodes: 0, links: 0, nodesTotal: TECH_COUNT, linksTotal: 0 },
  logoScale: 1,
  reduced: false,
};

export function resetTechState() {
  Object.assign(techState, { enter: 0, progress: 0, pulse: 0, final: 0, logoScale: 1, reduced: false });
  techState.grow.fill(0);
  Object.assign(techState.view, INTRO_VIEW);
  techState.screen.forEach((s) => { s.on = 0; });
  techState.hubScreen.forEach((s) => { s.on = 0; });
  techState.online.nodes = 0;
  techState.online.links = 0;
}

/* ── hover / selection / phase store (read by React through useSyncExternalStore) ── */
const subs = new Set<() => void>();
const emit = () => subs.forEach((l) => l());
const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };

/** "" = none. `hover` previews, `selected` locks, `project` narrows the relationship highlight to one project. */
export const focusState = { hover: "", selected: "", project: "", phase: 0, version: 0 };
const bump = () => { focusState.version++; emit(); };

export const hoverTech = (id: string | null) => {
  const n = id ?? "";
  if (focusState.hover !== n) { focusState.hover = n; bump(); }
};
/** Click / Enter: lock a technology. Selecting the locked one again deselects it. */
export const selectTech = (id: string) => {
  focusState.selected = focusState.selected === id ? "" : id;
  focusState.project = "";
  bump();
};
export const selectProject = (id: string) => {
  if (!focusState.selected) return;
  focusState.project = focusState.project === id ? "" : id;
  bump();
};
export const clearSelection = () => {
  if (!focusState.selected && !focusState.project) return;
  focusState.selected = "";
  focusState.project = "";
  bump();
};
export const setPhase = (i: number) => {
  const n = Math.min(PHASE_COUNT - 1, Math.max(0, i));
  if (focusState.phase !== n) { focusState.phase = n; bump(); }
};
export const resetFocus = () => { Object.assign(focusState, { hover: "", selected: "", project: "", phase: 0 }); bump(); };
/** What the 3D scene shows: hover previews over a locked selection. */
export const currentFocus = () => (focusState.hover || focusState.selected);

export function useTechFocus() {
  useSyncExternalStore(subscribe, () => focusState.version, () => 0);
  const { hover, selected, project, phase } = focusState;
  return { hover, selected, project, phase, focus: hover || selected, related: relatedIds(selected, project) };
}

/** "Go to phase i", registered by the scroll controller (scrolls, or poses the scene under reduced motion). */
let go: ((i: number) => void) | null = null;
export const registerTechScroll = (fn: ((i: number) => void) | null) => { go = fn; };
export const goToPhase = (i: number) => (go ? go(i) : setPhase(i));
