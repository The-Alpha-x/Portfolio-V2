"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CareerMaterials } from "./careerMaterials";
import type { CareerQuality } from "@/lib/careerTier";
import Instances, { type Inst } from "./Instances";

const FLOOR = -6; // tunnel floor (y)
const HY = 6; // half height
const HZ = 9; // half width (z) — same 3:2 proportion as the About corridor (6 × 4), scaled ×3
const SPAN = 30; // tunnel runs x ∈ [−SPAN, SPAN]
const BAY = 6; // rib spacing = node spacing, ribs sit ON the node x-positions

/**
 * The About corridor, continued: the same square structural ribs and segmented crimson light strips, turned 90° so the
 * tunnel now runs along X — the timeline axis. The walls have dissolved (only ribs + light remain), so the nodes float
 * in the void between them. Instanced only (≈6 draw calls), fogged into the distance.
 */
export default function CareerArchitecture({ mats, env, q }: { mats: CareerMaterials; env: THREE.Texture | null; q: CareerQuality }) {
  const d = q.detail;

  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1d191b", metalness: 0.95, roughness: 0.38, envMap: env, envMapIntensity: 0.9 }), [env]);
  const trim = useMemo(() => { const m = mats.crimsonDim.clone(); m.emissiveIntensity = 0.5; return m; }, [mats]);
  const seam = useMemo(() => { const m = mats.crimsonDim.clone(); m.emissiveIntensity = 0.22; return m; }, [mats]);
  const box = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  useEffect(() => () => { steel.dispose(); trim.dispose(); seam.dispose(); box.dispose(); }, [steel, trim, seam, box]);

  const L = useMemo(() => {
    const step = BAY / d; // tablet: every other rib
    const xs: number[] = [];
    for (let x = -SPAN; x <= SPAN + 0.01; x += step) xs.push(x);

    // rib frames (YZ plane): ceiling, floor and BACK bar. There is deliberately NO front (+Z) bar: the career camera lives on
    // the +Z side (overview z=14, node poses z=7.5, travel arc peaks at z≈9.1). A front bar at z=9 stood on the node x-positions,
    // so every hop between companies drove the camera through a solid rib at mid-travel, and the overview shot had pillars
    // in front of the nodes. Open on the camera side = nothing to clip, nothing to occlude.
    const ribs: Inst[] = xs.flatMap((x) => [
      { p: [x, HY, 0], s: [0.5, 0.5, HZ * 2 + 0.5] },
      { p: [x, FLOOR, 0], s: [0.5, 0.5, HZ * 2 + 0.5] },
      { p: [x, 0, -HZ], s: [0.5, HY * 2 + 0.5, 0.5] },
    ]);
    // thin crimson edge on every second back bar (the lit "gate" edge)
    const edges: Inst[] = xs.filter((_, k) => k % 2 === 0).map((x) => ({ p: [x + 0.28, 0, -HZ + 0.1], s: [0.04, HY * 2 - 0.4, 0.04] }));

    // segmented light strips along X (gaps hide behind the ribs, like the corridor's 5-unit dashes)
    const bays = xs.slice(0, -1).map((x) => x + step / 2);
    const lines: [number, number][] = [[4.5, -HZ + 0.1], [-4.5, -HZ + 0.1], [HY - 0.1, 0]];
    const strips: Inst[] = lines.flatMap(([y, z]) => bays.map((x) => ({ p: [x, y, z] as [number, number, number], s: [step - 0.7, 0.07, 0.07] as [number, number, number] })));

    // floor: panel seams along X and at each rib
    const nl = d < 1 ? 3 : 5;
    const floorLines: Inst[] = Array.from({ length: nl }, (_, k) => ({ p: [0, FLOOR + 0.04, (k - (nl - 1) / 2) * 4] as [number, number, number], s: [SPAN * 2, 0.01, 0.03] as [number, number, number] }));
    const cross: Inst[] = xs.map((x) => ({ p: [x, FLOOR + 0.04, 0], s: [0.03, 0.01, HZ * 2] }));
    return { ribs, edges, strips, floorLines, cross };
  }, [d]);

  return (
    <group name="career-architecture">
      <Instances geo={box} mat={steel} items={L.ribs} />
      <Instances geo={box} mat={trim} items={L.edges} />
      <Instances geo={box} mat={trim} items={L.strips} />
      <Instances geo={box} mat={seam} items={L.floorLines} />
      <Instances geo={box} mat={seam} items={L.cross} />
    </group>
  );
}
