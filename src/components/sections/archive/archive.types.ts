/** Engineering Archive data model. Content lives in `src/data/projects.ts`; presentation never hard-codes it. */
export interface ProjectShot {
  /** Public path, e.g. /images/projects/cubicle-kitchens/dashboard-1280.webp (provided by the owner — never generated). */
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export interface Project {
  id: string;
  name: string;
  /** featured → large platform + full panel; secondary → smaller showcase. */
  kind: "featured" | "secondary";
  /** One-line description (owner-provided wording). */
  tagline: string;
  /** Longer description, restating only facts from the CV. */
  summary: string;
  /** From the CV career entry that owns this project. */
  company: string;
  position: string;
  period: string;
  /** e.g. "Part of the Cubicle Kitchens ecosystem". */
  partOf?: string;
  /** Verb the CV uses for this project ("Engineered", "Built"…). */
  verb: string;
  /** null → not provided; section hidden in production. */
  problem: string | null;
  features: string[];
  technical: string[];
  /** Confirmed technologies ONLY. Empty → not provided. */
  stack: string[];
  screenshots: ProjectShot[];
  links: { live?: string; github?: string };
  needsConfirmation: string[];
}

/** GSAP → WebGL bridge for Scene 04 (mutable on purpose; never React state). */
export interface ArchiveSceneState {
  enter: number; progress: number; active: number;
  focus: number[]; spin: number[];
  pulse: number; arc: number;
  cam: { px: number; py: number; pz: number; tx: number; ty: number; tz: number; fov: number };
  reduced: boolean;
}
