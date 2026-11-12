import type { TechCategoryId } from "./technologies";

/**
 * Scene 05 network layout — pure data (no three.js). Scene-local units, +y up, +z towards the camera.
 *
 * COMPOSITION: the nervous system grows from a ROOT at far left, up a trunk into the FRONTEND cluster (top-left, front layer),
 * then drops back into the deeper BACKEND layer (bottom-centre), and from there to DATA (top-right, deepest), TOOLS
 * (bottom-right) and INTEGRATIONS (centre-right, which also reaches back to the frontend).
 *
 * Every id here is stable: `hub:<category>`, `relay:<n>`, `root`, and technology ids from technologies.ts. Connection ids are derived
 * from their end points (`<from>><to>`), so they never change when the list order changes.
 */
export type Vec3 = readonly [number, number, number];

/** Growth channels driven by the scroll timeline. Order = index into `techState.grow`. */
export type NetworkGroup = "root" | TechCategoryId;
export const GROUP_ORDER: readonly NetworkGroup[] = ["root", "frontend", "backend", "data", "tools", "integrations"];
export const GROUP_COUNT = GROUP_ORDER.length;
export const groupIndex = (g: NetworkGroup): number => GROUP_ORDER.indexOf(g);

export interface StructNodeDef { id: string; kind: "root" | "relay" | "hub"; pos: Vec3; category?: TechCategoryId }

export const STRUCT_NODES: readonly StructNodeDef[] = [
  { id: "root", kind: "root", pos: [-8.0, -0.6, -0.5] },
  { id: "relay:trunk-1", kind: "relay", pos: [-5.8, -0.6, -0.5] },
  { id: "relay:trunk-2", kind: "relay", pos: [-4.4, 0.8, 0.1] },
  { id: "hub:frontend", kind: "hub", category: "frontend", pos: [-2.6, 1.8, 0.6] },
  { id: "hub:backend", kind: "hub", category: "backend", pos: [4.0, -2.4, -2.4] },
  { id: "hub:data", kind: "hub", category: "data", pos: [9.8, -0.6, -4.8] },
  { id: "hub:tools", kind: "hub", category: "tools", pos: [7.8, -4.8, 0.2] },
  { id: "hub:integrations", kind: "hub", category: "integrations", pos: [7.4, 0.8, -1.8] },
];

export const hubId = (c: TechCategoryId) => `hub:${c}`;

/** Chip positions of every technology (the logo floats above its chip). Keep ≥1.6 units apart in screen space. */
export const TECH_POSITIONS: Readonly<Record<string, Vec3>> = {
  // Frontend — front layer, top-left
  react: [-1.4, 4.2, 1.4],
  nextjs: [1.4, 4.4, 0.4],
  typescript: [2.4, 2.2, 1.8],
  javascript: [4.6, 3.8, 0.2],
  html: [-6.0, 2.0, -1.8],
  css: [-4.8, -0.6, 0.4],
  "react-native": [-0.6, -0.4, 2.8],
  tailwind: [-3.0, -1.8, 2.4],
  primereact: [1.6, 0.4, -1.0],
  // Backend — deeper layer
  laravel: [1.4, -3.4, -3.2],
  php: [4.8, -0.2, -3.4],
  nodejs: [6.2, -4.2, -1.8],
  // Data & cloud — deepest layer
  firebase: [8.6, 1.4, -5.6],
  mysql: [12.0, 0.4, -4.6],
  mongodb: [13.4, -1.6, -5.2],
  // Tools & frameworks
  git: [6.4, -6.4, 1.2],
  slack: [9.8, -6.2, 0.6],
  shadcn: [10.6, -3.8, 1.0],
  // Integrations
  "rest-api": [6.6, 3.0, -0.8],
  payments: [10.4, 2.0, -1.4],
  "third-party": [8.6, -2.2, 0.0],
};

/** Scroll-window (0..1 inside the connection's growth channel) for an explicit connection. */
export interface TrunkDef { from: string; to: string; group: NetworkGroup; window: readonly [number, number] }

/** The spine. root → trunk → frontend hub happens in phase 01; each later hub is reached by its own channel. */
export const TRUNKS: readonly TrunkDef[] = [
  { from: "root", to: "relay:trunk-1", group: "root", window: [0.0, 0.34] },
  { from: "relay:trunk-1", to: "relay:trunk-2", group: "root", window: [0.3, 0.62] },
  { from: "relay:trunk-2", to: "hub:frontend", group: "root", window: [0.58, 0.96] },
  { from: "hub:frontend", to: "hub:backend", group: "backend", window: [0.0, 0.42] },
  { from: "hub:backend", to: "hub:data", group: "data", window: [0.0, 0.4] },
  { from: "hub:backend", to: "hub:tools", group: "tools", window: [0.0, 0.4] },
  { from: "hub:backend", to: "hub:integrations", group: "integrations", window: [0.0, 0.36] },
];

/** Purely structural cross-links that tie the integration layer to the other groups (not listed as "connected technologies"). */
export const CROSS_LINKS: readonly { from: string; to: string; window: readonly [number, number] }[] = [
  { from: "hub:integrations", to: "hub:data", window: [0.5, 0.78] },
  { from: "hub:integrations", to: "hub:tools", window: [0.6, 0.88] },
  { from: "rest-api", to: "typescript", window: [0.7, 1.0] },
];

/** Set-dressing: dark circuit panels behind the network (layered, facing the camera). Never overlap the node volume (z > −6). */
export interface BackdropPanel { z: number; cx: number; cy: number; w: number; h: number; seed: number }
export const BACKDROP_PANELS: readonly BackdropPanel[] = [
  { z: -8.2, cx: 2.8, cy: -0.4, w: 19, h: 11.5, seed: 11 },
  { z: -10.8, cx: 7.5, cy: -2.6, w: 17, h: 10.5, seed: 23 },
  { z: -13.4, cx: -2.0, cy: 1.8, w: 20, h: 11, seed: 37 },
];
export const PANEL_DEPTH = 0.16;
