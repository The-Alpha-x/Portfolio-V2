import { sceneState } from "./sceneState";
/**
 * True when scene `i` is outside the adjacency window SceneSlot renders (|active − i| ≤ 1).
 * Scenes keep `enter = 1` after you scroll past them (so scrolling back is seamless); this lets their per-frame work stop
 * while they are two or more scenes away and invisible.
 */
export const slotIdle = (i: number) => Math.abs(sceneState.active - i) > 1;
