"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CareerMaterials } from "./careerMaterials";
import { CAREER_COLORS as C } from "./careerConfig";
import type { CareerQuality } from "@/lib/careerTier";
import CareerArchitecture from "./CareerArchitecture";
import CareerMachinery from "./CareerMachinery";
import CareerAtmosphere from "./CareerAtmosphere";

/** Scene-local lights + dark industrial set dressing. Local env map is passed in via `mats`. */
export default function CareerEnvironment({ mats, q, env }: { mats: CareerMaterials; q: CareerQuality; env: THREE.Texture | null }) {
  const geo = useMemo(
    () => ({
      floor: new THREE.PlaneGeometry(140, 100),
    }),
    [q.segments]
  );
  const floorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#0b0a0b", metalness: 0.9, roughness: 0.4, envMap: env, envMapIntensity: 0.55 }),
    [env]
  );
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      floorMat.dispose();
    },
    [geo, floorMat]
  );

  return (
    <group name="career-environment">
      {/* lighting: key (cool metal), crimson rim/fill points */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[-6, 8, 6]} intensity={1.0} color={C.metal} />
      <pointLight position={[0, 3, 4]} intensity={q.sceneLights === 1 ? 20 : 14} distance={16} decay={2} color={C.crimson} />
      {q.sceneLights > 1 && <pointLight position={[-9, -1, 3]} intensity={8} distance={12} decay={2} color={C.crimsonDeep} />}
      {q.sceneLights > 2 && <pointLight position={[10, 2, -4]} intensity={10} distance={16} decay={2} color={C.crimson} />}

      {/* floor far below the timeline */}
      <mesh geometry={geo.floor} material={floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, -24]} />

      {/* v6 depth layers: vault + monoliths, timeline machinery, light shafts / haze */}
      <CareerArchitecture mats={mats} env={env} q={q} />
      <CareerMachinery mats={mats} q={q} />
      <CareerAtmosphere q={q} />

    </group>
  );
}
