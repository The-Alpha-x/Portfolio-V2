"use client";

import { useDeviceProfile, markWebglFailed, type LayoutTier } from "./deviceProfile";

/**
 * Scene 03–06 layout tier — decides WHICH experience renders for the content sections.
 *   full  → desktop: pinned cinematic 3D stages
 *   lite  → tablet / touch-large: same 3D stages, reduced geometry / lights / particles
 *   list  → phones (by hardware, not just width), no WebGL, low-power or data-saver devices: semantic vertical layout, no 3D, no pin
 * The decision lives in `deviceProfile.ts` (capability-based). Server + first hydration render are always "list".
 */
export type CareerTier = LayoutTier;

/** Called by the canvas error boundary if the 3D layer crashes → every scene falls back to its DOM layout. */
export const markCareerWebglFailed = markWebglFailed;

export const useCareerTier = (): CareerTier => useDeviceProfile().layout;

/** 3D budget per tier. */
export interface CareerQuality {
  particles: number;
  nodeLights: boolean; // per-node point lights
  sceneLights: number; // scene-local point lights (0–3)
  slabs: number; // set-dressing blocks
  arches: number;
  float: boolean; // Drei <Float> idle motion
  segments: number; // 1 = full, 0.5 = reduced torus/cylinder detail
  ticks: number;
  /** Environment richness multiplier for the backdrop architecture (1 = full, 0.5 = tablet). */
  detail: number;
}
export const QUALITY: Record<"full" | "lite", CareerQuality> = {
  full: { particles: 200, nodeLights: true, sceneLights: 3, slabs: 7, arches: 2, float: true, segments: 1, ticks: 16, detail: 1 },
  lite: { particles: 70, nodeLights: false, sceneLights: 1, slabs: 3, arches: 1, float: false, segments: 0.5, ticks: 8, detail: 0.5 },
};

/** Content placeholders ("awaiting confirmation") are shown in dev only; set NEXT_PUBLIC_CAREER_MARKERS=1 to force. */
export const SHOW_CONFIRMATION_MARKERS =
  process.env.NEXT_PUBLIC_CAREER_MARKERS === "1" || process.env.NODE_ENV !== "production";
