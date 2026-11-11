"use client";
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { archiveState } from "@/lib/archiveState";
import { careerState } from "@/lib/careerState";
import { PROJECTS } from "@/data/projects";
import { useCareerTier } from "@/lib/careerTier";
import { useCareerAssets } from "../career/careerMaterials";
import ArchiveEnvironment from "./ArchiveEnvironment";
import ArchiveParticles from "./ArchiveParticles";
import ProjectPlatform from "./ProjectPlatform";
import { ARCHIVE_ORIGIN, ARCHIVE_QUALITY } from "./archiveConfig";

const { lerp, smoothstep } = THREE.MathUtils;
const FOG = { near: 10, far: 42 }; // the lab is deeper than the shared fog (8–24); restored when leaving

/**
 * Scene 04 3D layer (persistent canvas, slot 3 — no second canvas).
 * Camera: GSAP writes `archiveState.cam`; this component is the only writer of the Three.js camera while `enter > 0`.
 * It SETS (never damps) the camera: Career's rig also writes in the same frame (earlier slot), and damping on top of
 * another writer would fight it. The entry blend runs from the camera's pose at hand-over to the first project pose,
 * sweeping through fog-dark empty space between the two sets.
 */
export default function ArchiveCanvas() {
  const gl = useThree((s) => s.gl);
  const tier = useCareerTier();
  const q = ARCHIVE_QUALITY[tier === "lite" ? "lite" : "full"];
  const root = useRef<THREE.Group>(null);
  const from = useRef<{ p: THREE.Vector3; t: THREE.Vector3; fov: number } | null>(null);
  const fog = useRef<{ near: number; far: number } | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);

  const assets = useCareerAssets(gl); // effect-created (StrictMode-safe), null for the first frame

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const f = state.scene.fog as THREE.Fog | null;
    const on = archiveState.enter > 0.001;
    if (root.current) root.current.visible = on;

    if (!on) {
      if (from.current) { from.current = null; if (f && fog.current) { f.near = fog.current.near; f.far = fog.current.far; } fog.current = null; }
      return;
    }
    if (!from.current) {
      const c = careerState;
      from.current = {
        p: camera.position.clone(),
        t: c.enter > 0.5 ? new THREE.Vector3(c.cam.tx, c.cam.ty, c.cam.tz) : new THREE.Vector3(0, 0, 0),
        fov: camera.fov,
      };
      if (f) fog.current = { near: f.near, far: f.far };
    }
    const e = smoothstep(archiveState.enter, 0, 1);
    const c = archiveState.cam;
    const a = archiveState.arc;
    const fr = from.current;
    camera.position.set(lerp(fr.p.x, c.px, e), lerp(fr.p.y, c.py + a * 0.9, e), lerp(fr.p.z, c.pz + a * 1.8, e));
    look.set(lerp(fr.t.x, c.tx, e), lerp(fr.t.y, c.ty, e), lerp(fr.t.z, c.tz, e));
    camera.lookAt(look);
    const fov = lerp(fr.fov, c.fov + a * 3, e);
    if (Math.abs(fov - camera.fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (f && fog.current) { f.near = lerp(fog.current.near, FOG.near, e); f.far = lerp(fog.current.far, FOG.far, e); }
  });

  return (
    <group ref={root} name="archive-scene" visible={false} position={[...ARCHIVE_ORIGIN]}>
      {assets && (
        <>
          <ArchiveEnvironment mats={assets.mats} q={q} />
          {PROJECTS.map((p, i) => <ProjectPlatform key={p.id} index={i} mats={assets.mats} q={q} />)}
          <ArchiveParticles count={q.particles} />
        </>
      )}
    </group>
  );
}
