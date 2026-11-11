/** Scene registry — single source of truth for ids, nav labels and counts. */
export const SCENES = [
  { id: "scene-01", label: "01", name: "IDENTITY" },
  { id: "scene-02", label: "02", name: "ORIGIN" },
  { id: "scene-03", label: "03", name: "EVOLUTION" },
  { id: "scene-04", label: "04", name: "ARCHIVE" },
  { id: "scene-05", label: "05", name: "ARSENAL" },
  { id: "scene-06", label: "06", name: "CONNECTION" },
] as const;

export const SCENE_COUNT = SCENES.length;
