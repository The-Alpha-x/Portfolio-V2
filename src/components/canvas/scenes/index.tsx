import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import HeroScene from "./hero/HeroScene";
import AboutScene from "./about/AboutScene";

/**
 * Scene registry. Each scene is one folder in this directory; register it by index.
 * 0 → Scene 01 (hero)   1 → Scene 02 (about / corridor)   2 → Scene 03 (career)   3 → archive   4 → tech   5 → connect
 *
 * Scenes 01–02 are the first screens and ship in the canvas chunk. Scenes 03–06 are code-split: their modules (and the
 * geometry/textures they build on mount) are fetched only when the visitor gets near them (see SceneRoot), and never on
 * devices whose layout tier is the DOM list.
 */
type SceneComponent = ComponentType | LazyExoticComponent<ComponentType>;

export const SCENE_COMPONENTS: Partial<Record<number, SceneComponent>> = {
  0: HeroScene,
  1: AboutScene,
  2: lazy(() => import("./career/CareerCanvas")),
  3: lazy(() => import("./archive/ArchiveCanvas")),
  4: lazy(() => import("./tech/TechCanvas")),
  5: lazy(() => import("./connect/ConnectCanvas")),
};
