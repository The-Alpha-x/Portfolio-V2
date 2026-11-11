/** Career data model. Content lives in `src/data/career.ts`; presentation never hard-codes it. */

export interface CareerProject {
  id: string;
  /** Project name exactly as written in the CV (or a neutral label when the CV gives none — see `nameConfirmed`). */
  name: string;
  /** What the CV says about it. */
  summary: string;
  /** false → the CV does not name this project; `name` is a neutral label that needs confirmation. */
  nameConfirmed: boolean;
}

export interface CareerEntry {
  id: string;
  company: string;
  position: string;
  /** Location text exactly as printed in the CV next to the company, if any. */
  location?: string;
  /** The CV gives years only. Month precision requires confirmation. */
  startDate: string;
  /** `null` = current role. */
  endDate: string | null;
  /** Role-level description. `null` = the CV has none → requires confirmation (nothing is invented). */
  description: string | null;
  /** CV bullet points for this role, verbatim. */
  responsibilities: string[];
  projects: CareerProject[];
  /** Human-readable list of details that could NOT be verified from the CV. */
  needsConfirmation: string[];
}

/** Camera rig values owned by GSAP (written by the scroll controller, read by CareerCanvas in useFrame). */
export interface CareerCamRig {
  px: number; py: number; pz: number; // position
  tx: number; ty: number; tz: number; // look-at target
  fov: number;
}

/** Scene 03 DOM/GSAP ↔ WebGL bridge. Mutable on purpose: GSAP writes, R3F reads in useFrame; never React state. */
export interface CareerSceneState {
  enter: number; // 0..1 section arriving (camera blends from the shared default into the rig)
  progress: number; // 0..1 through the pinned journey
  active: number; // index of the focused CareerEntry (HTML selection; set at phase boundaries only)
  focus: number[]; // per node 0..1 activation (emissive, rings, halo)
  link: number[]; // per connection 0..1 "energised" fill
  pulse: number; // 0..1 particle activity
  arc: number; // 0..1 transient camera arc while travelling between nodes
  cam: CareerCamRig;
  reduced: boolean; // static (non-scrubbed) mode
}
