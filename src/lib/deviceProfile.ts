"use client";

import { useSyncExternalStore } from "react";

/**
 * Device capability profile — decides HOW MUCH 3D a visitor gets. Width is only one input.
 *
 *   canvas  "full" → desktop cinematic 3D        "lite" → simplified 3D (fewer particles, lower DPR, no MSAA)
 *           "none" → no WebGL canvas at all: static portrait + CSS atmosphere, three.js is never downloaded
 *   layout  "full" | "lite" | "list" → how sections 03–06 render (pinned 3D stage vs. semantic vertical list)
 *
 * Inputs (in priority order):
 *   1. ?quality=full|lite|static   manual override (QA / demos); sticky for the tab via sessionStorage
 *   2. WebGL missing / crashed / context lost twice                       → none
 *   3. Save-Data, 2g/slow-2g, reduced data                               → none
 *   4. Software renderer (SwiftShader, llvmpipe, Microsoft Basic Render) → none
 *   5. Low-end hardware: deviceMemory ≤ 2, ≤ 2 cores, very old mobile GPU → none
 *   6. Phone-class device (coarse pointer + short side < 600 CSS px, ANY orientation) → lite canvas, "list" layout
 *   7. Tablet / small window / coarse pointer                                         → lite canvas, "lite" layout
 *   8. Otherwise                                                                      → full
 *   Runtime: sustained low FPS on "lite" calls `degradeCanvas()` → none (the page keeps working, minus 3D).
 *
 * Server + first hydration render are always "none"/"list" (works without JS); the client then upgrades.
 */
export type CanvasTier = "full" | "lite" | "none";
export type LayoutTier = "full" | "lite" | "list";
export interface DeviceProfile {
  canvas: CanvasTier;
  layout: LayoutTier;
  /** phone-class device (by hardware, not window width) */
  phone: boolean;
  /** primary input is touch */
  touch: boolean;
  /** why the tier was chosen — shown in the console with ?quality-debug */
  reason: string;
}

const SERVER_PROFILE: DeviceProfile = { canvas: "none", layout: "list", phone: false, touch: false, reason: "server" };

type Nav = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
};

let override: "full" | "lite" | "static" | null | undefined;
let failures = 0; // context lost / canvas crash count
let degraded = false; // runtime FPS downgrade
let cache: DeviceProfile | null = null;
const listeners = new Set<() => void>();

function readOverride(): "full" | "lite" | "static" | null {
  if (override !== undefined) return override;
  override = null;
  try {
    const q = new URLSearchParams(window.location.search).get("quality");
    if (q === "full" || q === "lite" || q === "static") {
      override = q;
      sessionStorage.setItem("hm-quality", q);
    } else {
      const s = sessionStorage.getItem("hm-quality");
      if (s === "full" || s === "lite" || s === "static") override = s;
    }
  } catch {
    /* storage blocked — ignore */
  }
  return override;
}

interface GlInfo { ok: boolean; renderer: string }
let glInfo: GlInfo | null = null;

/** One throw-away probe context, released immediately (never competes with the persistent canvas). */
function probeWebGL(): GlInfo {
  if (glInfo) return glInfo;
  glInfo = { ok: false, renderer: "" };
  try {
    const c = document.createElement("canvas");
    // three r163+ is WebGL2-only: a WebGL1 context would pass a looser probe and then crash after downloading three.
    const gl = c.getContext("webgl2") as WebGL2RenderingContext | null;
    if (gl) {
      glInfo.ok = true;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      glInfo.renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || "").toLowerCase();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    glInfo.ok = false;
  }
  return glInfo;
}

/** Software rasterisers and long-obsolete mobile GPUs: WebGL "works" but runs at a few FPS. */
const WEAK_GPU = /swiftshader|llvmpipe|softpipe|software|microsoft basic render|mali-4\d\d|mali-t[56]\d\d|adreno \(tm\) [23]\d\d\b|adreno [23]\d\d\b|powervr sgx|vivante gc|apple software/;

function compute(): DeviceProfile {
  const w = window.innerWidth;
  const nav = navigator as Nav;
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(window.screen?.width || w, window.screen?.height || w, w);
  // Phone-class = hardware property: coarse pointer and a short physical side under 600 CSS px (a phone in landscape is still a phone).
  const phone = touch && Math.min(window.screen?.width || w, window.screen?.height || w) < 600;
  const base = { phone, touch };

  const ov = readOverride();
  if (ov === "static") return { ...base, canvas: "none", layout: "list", reason: "override:static" };
  if (ov === "lite") return { ...base, canvas: "lite", layout: phone || w < 768 ? "list" : "lite", reason: "override:lite" };
  if (ov === "full") return { ...base, canvas: "full", layout: "full", reason: "override:full" };

  if (failures >= 1) return { ...base, canvas: "none", layout: "list", reason: "webgl-failed" };
  if (degraded) return { ...base, canvas: "none", layout: "list", reason: "runtime-fps" };

  const gl = probeWebGL();
  if (!gl.ok) return { ...base, canvas: "none", layout: "list", reason: "no-webgl" };
  if (nav.connection?.saveData) return { ...base, canvas: "none", layout: "list", reason: "save-data" };
  if (/(^|-)2g$/.test(nav.connection?.effectiveType ?? "")) return { ...base, canvas: "none", layout: "list", reason: "slow-network" };
  if (WEAK_GPU.test(gl.renderer)) return { ...base, canvas: "none", layout: "list", reason: `weak-gpu:${gl.renderer}` };
  if ((nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2) return { ...base, canvas: "none", layout: "list", reason: "low-end-hardware" };

  // 3D is only worth it when the window can show the sections' 3D stages.
  if (phone || shortSide < 600 || w < 768) return { ...base, canvas: "lite", layout: "list", reason: "phone" };
  if (w < 1200 || touch || (nav.deviceMemory ?? 8) <= 4) return { ...base, canvas: "lite", layout: "lite", reason: "tablet-or-touch" };
  return { ...base, canvas: "full", layout: "full", reason: "desktop" };
}

function snapshot(): DeviceProfile {
  return (cache ??= compute());
}

function emit() {
  cache = null;
  listeners.forEach((l) => l());
}

/** Called by the canvas error boundary / context-loss handler: 3D layer crashed → everything falls back to the DOM experience. */
export function markWebglFailed() {
  if (failures >= 1) return;
  failures++;
  emit();
}

/** Called by PerformanceMonitor when frame rate stays low even at the minimum resolution. */
export function degradeCanvas() {
  if (degraded) return;
  if (readOverride()) return; // QA override wins
  const cur = snapshot();
  if (cur.canvas === "full") return; // desktops: never hard-downgrade, DPR scaling is enough
  degraded = true;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mqs = [window.matchMedia("(max-width: 767px)"), window.matchMedia("(max-width: 1199px)"), window.matchMedia("(pointer: coarse)")];
  const onChange = () => {
    const prev = cache;
    const next = compute();
    if (!prev || prev.canvas !== next.canvas || prev.layout !== next.layout) {
      cache = next;
      listeners.forEach((l) => l());
    }
  };
  mqs.forEach((m) => m.addEventListener("change", onChange));
  return () => {
    listeners.delete(cb);
    mqs.forEach((m) => m.removeEventListener("change", onChange));
  };
}

export const useDeviceProfile = (): DeviceProfile => useSyncExternalStore(subscribe, snapshot, () => SERVER_PROFILE);
export const useCanvasTier = (): CanvasTier => useDeviceProfile().canvas;

/** Non-React read (preloader, hero setup). Client only. */
export const getDeviceProfile = (): DeviceProfile => (typeof window === "undefined" ? SERVER_PROFILE : snapshot());

/**
 * Tier-dependent 3D budgets for the shared layer (hero + corridor + renderer). Scene-specific budgets stay in each scene's config.
 */
export interface CanvasBudget {
  maxDpr: number;
  minDpr: number;
  antialias: boolean;
  powerPreference: "high-performance" | "default" | "low-power";
  heroDust: number;
  heroBurst: number;
  heroShards: number;
  corridorHaze: number;
  corridorDust: number;
  anisotropy: number;
  /** corridor rib spacing multiplier (2 = half as many ribs) */
  ribStride: number;
  pointLight: boolean;
}

export const BUDGET: Record<"full" | "lite", CanvasBudget> = {
  full: { maxDpr: 1.75, minDpr: 1, antialias: true, powerPreference: "high-performance", heroDust: 720, heroBurst: 5200, heroShards: 36, corridorHaze: 12, corridorDust: 1300, anisotropy: 8, ribStride: 1, pointLight: true },
  lite: { maxDpr: 1.25, minDpr: 0.75, antialias: false, powerPreference: "default", heroDust: 220, heroBurst: 1800, heroShards: 14, corridorHaze: 6, corridorDust: 420, anisotropy: 2, ribStride: 2, pointLight: false },
};
