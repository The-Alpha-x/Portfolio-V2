import { TECH_CATEGORIES, type TechCategoryId } from "./technologies";

/**
 * Pure numbers/strings (no three.js): the scroll controller, the reduced-motion poses, the selector and the HTML interface all
 * read this one file, and the controller is not forced to download three.
 */
const ALL: readonly TechCategoryId[] = TECH_CATEGORIES.map((c) => c.id);

export interface TechPhase {
  id: string;
  label: string;
  short: string;
  /** Scroll range in percent of the pinned timeline. */
  range: readonly [number, number];
  /** Categories listed in the interface during this phase. */
  cats: readonly TechCategoryId[];
  /** One-line status shown under the phase label. */
  note: string;
}

export const PHASES: readonly TechPhase[] = [
  { id: "init", label: "SYSTEM INITIALIZATION", short: "Init", range: [0, 15], cats: [], note: "Routing the core pathway…" },
  { id: "frontend", label: "FRONTEND NETWORK", short: "Frontend", range: [15, 35], cats: ["frontend"], note: "Interface layer online." },
  { id: "backend", label: "BACKEND ARCHITECTURE", short: "Backend", range: [35, 55], cats: ["backend", "data"], note: "Server core and data layer online." },
  { id: "systems", label: "DEVELOPMENT SYSTEMS", short: "Systems", range: [55, 75], cats: ["tools"], note: "Development systems attached." },
  { id: "integrations", label: "EXTERNAL INTEGRATIONS", short: "Integrations", range: [75, 90], cats: ["integrations"], note: "External pathways connected." },
  { id: "complete", label: "COMPLETE ARCHITECTURE", short: "Complete", range: [90, 100], cats: ALL, note: "All systems online." },
];

export const PHASE_COUNT = PHASES.length;

/** Phase index for a scroll percentage (0–100). */
export function phaseAt(pct: number): number {
  for (let i = PHASES.length - 1; i >= 0; i--) if (pct >= PHASES[i].range[0]) return i;
  return 0;
}

/**
 * Camera framing. The rig fits `w × h` (scene units, centred on x/y/z) into the free part of the screen (right of the interface),
 * then orbits `yaw`/`pitch` radians around it. Small angles only: the camera dollies, it never spins.
 */
export interface ViewPose { x: number; y: number; z: number; w: number; h: number; yaw: number; pitch: number }

export const PHASE_VIEWS: readonly ViewPose[] = [
  { x: -5.3, y: 0.2, z: -0.3, w: 8.4, h: 5.2, yaw: 0.2, pitch: 0.12 }, // 01 root + trunk
  { x: -1.8, y: 1.7, z: 0.5, w: 11.8, h: 7.8, yaw: 0.1, pitch: 0.15 }, // 02 frontend
  { x: 6.0, y: -1.5, z: -3.0, w: 15.5, h: 9.4, yaw: -0.12, pitch: 0.2 }, // 03 backend + data (deeper)
  { x: 7.4, y: -3.0, z: -0.8, w: 12.5, h: 8.8, yaw: 0.1, pitch: 0.22 }, // 04 tools
  { x: 7.4, y: -0.6, z: -1.4, w: 15.5, h: 10.2, yaw: -0.06, pitch: 0.17 }, // 05 integrations
  { x: 3.0, y: -1.0, z: -1.4, w: 19.6, h: 12.4, yaw: 0.05, pitch: 0.15 }, // 06 complete
];
/** Start pose of the intro: slightly wider and higher, dollying into phase 01. */
export const INTRO_VIEW: ViewPose = { ...PHASE_VIEWS[0], w: 11.5, h: 7.2, yaw: 0.34, pitch: 0.28 };

/** Settled state of every channel at the end of each phase. Order of `grow` = GROUP_ORDER (root, frontend, backend, data, tools, integrations). */
export interface PhasePose { grow: readonly number[]; pulse: number; final: number }
export const PHASE_POSES: readonly PhasePose[] = [
  { grow: [1, 0, 0, 0, 0, 0], pulse: 0, final: 0 },
  { grow: [1, 1, 0, 0, 0, 0], pulse: 0.15, final: 0 },
  { grow: [1, 1, 1, 1, 0, 0], pulse: 0.5, final: 0 },
  { grow: [1, 1, 1, 1, 1, 0], pulse: 0.5, final: 0 },
  { grow: [1, 1, 1, 1, 1, 1], pulse: 0.85, final: 0 },
  { grow: [1, 1, 1, 1, 1, 1], pulse: 1, final: 1 },
];

/** Timeline windows (percent of the pinned scroll) for each growth channel — [start, end]. Ends sit just before the phase boundary. */
export const GROW_WINDOWS: readonly (readonly [number, number])[] = [
  [1, 13.5], // root     — phase 01 (0–15)
  [16, 33.5], // frontend — phase 02 (15–35)
  [36, 51], // backend  — phase 03 (35–55)
  [43, 54], // data     — phase 03
  [57, 73.5], // tools    — phase 04 (55–75)
  [76, 89], // integrations — phase 05 (75–90)
];
