"use client";

import { useSyncExternalStore } from "react";
import { PROJECT_COUNT } from "@/data/projects";
import type { ArchiveSceneState } from "@/components/sections/archive/archive.types";

/** Scene 04 ↔ WebGL bridge. Written by ArchiveScrollController (GSAP), read in useFrame. Not React state. */
export const archiveState: ArchiveSceneState = {
  enter: 0, progress: 0, active: 0,
  focus: Array(PROJECT_COUNT).fill(0), spin: Array(PROJECT_COUNT).fill(0),
  pulse: 0, arc: 0,
  cam: { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, fov: 42 },
  reduced: false,
};

export function resetArchiveState() {
  Object.assign(archiveState, { enter: 0, progress: 0, active: 0, pulse: 0, arc: 0, reduced: false });
  archiveState.focus.fill(0);
  archiveState.spin.fill(0);
}

/* ── selection store (same pattern as careerSelection) ── */
const sel = new Set<() => void>();
export function selectProject(i: number) {
  const next = Math.min(PROJECT_COUNT - 1, Math.max(0, Math.round(i)));
  if (next === archiveState.active) return;
  archiveState.active = next;
  sel.forEach((l) => l());
}
export const useArchiveSelection = () =>
  useSyncExternalStore((cb) => { sel.add(cb); return () => { sel.delete(cb); }; }, () => archiveState.active, () => 0);

/* ── "go to project i": registered by the scroll controller; falls back to plain selection ── */
let go: ((i: number) => void) | null = null;
export const registerArchiveScroll = (fn: ((i: number) => void) | null) => { go = fn; };
export const goToProject = (i: number) => (go ? go(i) : selectProject(i));

/* ── case-study modal store ── */
let openId: string | null = null;
const modal = new Set<() => void>();
export const openCaseStudy = (id: string) => { openId = id; modal.forEach((l) => l()); };
export const closeCaseStudy = () => { if (openId === null) return; openId = null; modal.forEach((l) => l()); };
export const useCaseStudy = () =>
  useSyncExternalStore((cb) => { modal.add(cb); return () => { modal.delete(cb); }; }, () => openId, () => null);
