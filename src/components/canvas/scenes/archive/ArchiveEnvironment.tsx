"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { archiveState } from "@/lib/archiveState";
import type { CareerMaterials } from "../career/careerMaterials";
import { ARCHIVE_COLORS as C, ARCHIVE_ORIGIN, SPACING, type ArchiveQuality } from "./archiveConfig";
import { PROJECT_COUNT } from "@/data/projects";
import { slotIdle } from "@/lib/sceneGate";

const SPAN = PROJECT_COUNT * SPACING + 20;
/** Backdrop glass pylons [x-fraction, height, z] — different depths give natural parallax as the camera travels. */
const BACKDROPS: [number, number, number][] = [[-0.38, 9, -9], [0.05, 7, -14], [0.4, 10, -10], [-0.1, 8, -18]];

/** Dark product-lab shell: reflective floor, grid, light bars, glass backdrops, and ONE moving crimson key light. */
export default function ArchiveEnvironment({ mats, q }: { mats: CareerMaterials; q: ArchiveQuality }) {
  const key = useRef<THREE.PointLight>(null);
  const geo = useMemo(() => ({
    floor: new THREE.PlaneGeometry(SPAN * 1.2, 50),
    slab: new THREE.BoxGeometry(1, 1, 1),
    bar: new THREE.BoxGeometry(1, 0.06, 0.06),
  }), []);
  const grid = useMemo(() => (q.grid ? new THREE.GridHelper(SPAN * 1.2, Math.round(SPAN * 0.6), C.crimsonDeep, "#1a1517") : null), [q.grid]);
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#09080a", metalness: 0.85, roughness: 0.5 }), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#120f11", metalness: 0.7, roughness: 0.25, transparent: true, opacity: 0.55 }), []);
  useEffect(() => () => {
    Object.values(geo).forEach((g) => g.dispose());
    floorMat.dispose(); glass.dispose();
    if (grid) { grid.geometry.dispose(); (grid.material as THREE.Material).dispose(); }
  }, [geo, floorMat, glass, grid]);

  useFrame(() => {
    const l = key.current;
    if (!l || archiveState.enter < 0.001 || slotIdle(3)) return;
    const c = archiveState.cam; // follow the camera's focus point (local space = world − origin)
    l.position.set(c.tx - 1.5 - ARCHIVE_ORIGIN[0], c.ty - ARCHIVE_ORIGIN[1] + 2.6, c.tz - ARCHIVE_ORIGIN[2] + 3.5);
    l.intensity = 16 + 10 * archiveState.pulse;
  });

  return (
    <group name="archive-environment">
      <ambientLight intensity={0.14} />
      <directionalLight position={[-6, 9, 6]} intensity={0.9} color={C.metal} />
      <pointLight ref={key} intensity={16} distance={18} decay={2} color={C.crimson} />
      {q.fillLight && <pointLight position={[0, 5, -8]} intensity={9} distance={30} decay={2} color={C.crimsonDeep} />}

      <mesh geometry={geo.floor} material={floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.2, -4]} />
      {grid && <primitive object={grid} position={[0, -2.19, -4]} />}

      {/* ceiling light bars */}
      {[-0.35, -0.12, 0.12, 0.35].map((f, i) => (
        <mesh key={i} geometry={geo.bar} material={mats.crimsonDim} scale={[SPAN * 0.22, 1, 1]} position={[SPAN * f, 7.5, -2 - (i % 2) * 3]} />
      ))}

      {BACKDROPS.slice(0, q.backdrops).map(([f, h, z], i) => (
        <group key={i} position={[SPAN * f, h / 2 - 2.2, z]}>
          <mesh geometry={geo.slab} material={glass} scale={[3.2, h, 0.15]} />
          <mesh geometry={geo.slab} material={mats.crimsonDim} scale={[0.04, h, 0.2]} position={[1.62, 0, 0]} />
        </group>
      ))}
    </group>
  );
}
