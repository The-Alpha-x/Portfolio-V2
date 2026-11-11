"use client";
import { Suspense, useRef } from "react";
import { COLORS } from "@/lib/tokens";
import { SCENES } from "@/lib/scenes";
import { useActiveScene } from "@/lib/sceneState";
import { BUDGET, useDeviceProfile } from "@/lib/deviceProfile";
import SceneSlot, { forceCareer } from "./SceneSlot";
import { SCENE_COMPONENTS } from "./scenes";

/** Shared lighting rig (restrained red neon + cold metal rim). Cameras are owned by each scene. */
function Lights({ pointLight }: { pointLight: boolean }) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 5, 3]} intensity={1.1} color={COLORS.metal} />
      {pointLight && <pointLight position={[-4, -1, 2]} intensity={18} distance={14} color={COLORS.crimson} />}
    </>
  );
}

/**
 * Mounts each scene only when it is needed:
 *  - phones / DOM-list layouts never mount scenes 03–06 (their sections are plain HTML) → no geometry, textures, shader
 *    compiles or per-frame loops for content nobody can see;
 *  - everywhere else a scene is mounted (and its code chunk fetched) shortly before it is reached, and then stays mounted
 *    so scrolling back is seamless. Desktop looks two scenes ahead (more headroom for compile/upload), tablets one.
 * Each lazy scene has its own Suspense boundary so a late chunk/texture never blanks the scenes already on screen.
 */
export default function SceneRoot() {
  const profile = useDeviceProfile();
  const active = useActiveScene();
  const reached = useRef(0);
  reached.current = Math.max(reached.current, active);
  const ahead = profile.canvas === "full" ? 2 : 1;
  const budget = BUDGET[profile.canvas === "full" ? "full" : "lite"];

  return (
    <>
      <Lights pointLight={budget.pointLight} />
      {SCENES.map((_, i) => {
        const Scene = SCENE_COMPONENTS[i];
        if (!Scene) return null;
        const domOnly = i >= 2 && profile.layout === "list";
        const debugForced = i === 2 && forceCareer;
        if (domOnly && !debugForced) return null;
        if (i >= 2 && i > reached.current + ahead && !debugForced) return null;
        return (
          <SceneSlot key={i} index={i}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </SceneSlot>
        );
      })}
    </>
  );
}
