/** Scene 05 3D constants. Pure numbers/strings (no three imports). */
export const TECH_ORIGIN = [0, -170, 0] as const; // far below the Archive lab (−80); fog hides the gap
export const TECH_FOV = 40;

/** CRIMSON PROTOCOL colours for the 3D layer (Task 06 §2). Global tokens are untouched. */
export const NEURAL_COLORS = {
  bg: "#080808",
  surface: "#171113",
  crimson: "#e51b35",
  crimsonDeep: "#7a1020",
  hot: "#ff626b",
  metal: "#c1b9b8",
  steel: "#2a2226",
} as const;

export interface TechQuality {
  particles: number;
  /** decorative circuit traces on the backdrop panels */
  decor: number;
  panels: number;
  ics: number;
  floating: number;
  /** radial segments of every trace tube */
  sides: number;
  halos: boolean;
}
export const TECH_QUALITY: Record<"full" | "lite", TechQuality> = {
  full: { particles: 170, decor: 36, panels: 3, ics: 8, floating: 9, sides: 4, halos: true },
  lite: { particles: 56, decor: 14, panels: 2, ics: 3, floating: 0, sides: 3, halos: true },
};

export const FOG = { near: 20, far: 62 };
/** Logo plate size in scene units, and how far above its chip it floats. */
export const PLATE = 1.12;
export const LOGO_LIFT = 0.95;
export const EDGE_TEX_W = 256;
