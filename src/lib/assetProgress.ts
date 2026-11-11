import { onHeroReady } from "@/lib/heroState";

/**
 * Real loading status for the pre-loader — no timers pretending to be assets.
 *
 * Each task settles from an actual browser/app event. A task that fails, or is still pending when the stall guard
 * fires, is marked "failed"/"timeout" and counts as settled, so an optional asset can never hold the page hostage.
 * Progress = settled weight / total weight.
 */
export type AssetId = "fonts" | "portrait" | "load" | "scene";
export type AssetStatus = "pending" | "ready" | "failed" | "timeout" | "skipped";

interface Task { id: AssetId; weight: number; status: AssetStatus }

export interface AssetTracker {
  /** 0..1 */
  progress: () => number;
  status: (id: AssetId) => AssetStatus;
  stop: () => void;
}

export function detectWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

interface Options {
  /** Portrait file the hero will use (the same URL → one network request, browser cache). */
  portraitSrc: string;
  /** If false the 3D scene will never report ready, so it is skipped rather than awaited. */
  webgl: boolean;
  /** Stall guard: anything still pending after this long is released. NOT a progress timer. */
  stallMs: number;
  onChange: () => void;
}

export function trackAssets({ portraitSrc, webgl, stallMs, onChange }: Options): AssetTracker {
  const tasks: Task[] = [
    { id: "fonts", weight: 0.15, status: "pending" }, // next/font files (Inter Tight, JetBrains Mono)
    { id: "portrait", weight: 0.2, status: "pending" }, // hero portrait: fetched AND decoded
    { id: "load", weight: 0.15, status: "pending" }, // window "load": scripts, CSS, preloaded images
    { id: "scene", weight: 0.5, status: "pending" }, // persistent WebGL canvas mounted + portrait texture on the GPU
  ];
  const total = tasks.reduce((s, t) => s + t.weight, 0);
  const find = (id: AssetId) => tasks.find((t) => t.id === id)!;
  let stopped = false;
  const cleanups: Array<() => void> = [];

  const settle = (id: AssetId, status: Exclude<AssetStatus, "pending">) => {
    const t = find(id);
    if (stopped || t.status !== "pending") return;
    t.status = status;
    onChange();
  };

  /* fonts */
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => settle("fonts", "ready"), () => settle("fonts", "failed"));
  } else settle("fonts", "skipped");

  /* window load */
  if (document.readyState === "complete") settle("load", "ready");
  else {
    const onLoad = () => settle("load", "ready");
    window.addEventListener("load", onLoad, { once: true });
    cleanups.push(() => window.removeEventListener("load", onLoad));
  }

  /* portrait (same URL as the <link rel="preload"> and the WebGL texture → already in flight, no second download) */
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    (img.decode ? img.decode() : Promise.resolve()).then(
      () => settle("portrait", "ready"),
      () => settle("portrait", "ready") // decode() can reject for an already-usable image; the bytes did arrive
    );
  };
  img.onerror = () => settle("portrait", "failed"); // optional: the pre-loader simply shows no portrait
  img.src = portraitSrc;
  cleanups.push(() => {
    img.onload = null;
    img.onerror = null;
  });

  /* 3D scene */
  if (!webgl) settle("scene", "skipped");
  else cleanups.push(onHeroReady(() => settle("scene", "ready")));

  /* stall guard */
  const guard = window.setTimeout(() => {
    tasks.forEach((t) => settle(t.id, "timeout"));
  }, stallMs);
  cleanups.push(() => window.clearTimeout(guard));

  return {
    progress: () => tasks.reduce((s, t) => (t.status === "pending" ? s : s + t.weight), 0) / total,
    status: (id) => find(id).status,
    stop: () => {
      stopped = true;
      cleanups.forEach((c) => c());
      cleanups.length = 0;
    },
  };
}
