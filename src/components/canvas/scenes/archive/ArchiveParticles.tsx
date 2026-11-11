"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { archiveState } from "@/lib/archiveState";
import { ARCHIVE_COLORS as C, SPACING } from "./archiveConfig";
import { PROJECT_COUNT } from "@/data/projects";
import { slotIdle } from "@/lib/sceneGate";

/** Sparse drifting dust across the whole lab. One Points draw call; skipped while the scene is hidden. */
export default function ArchiveParticles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const phase = useRef(0);
  const { geo, mat, base } = useMemo(() => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const span = PROJECT_COUNT * SPACING + 16;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * span;
      pos[i * 3 + 1] = (rnd() - 0.4) * 11;
      pos[i * 3 + 2] = (rnd() - 0.5) * 22 - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: C.crimson, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geo: g, mat: m, base: pos.slice() };
  }, [count]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  useFrame((_, dt) => {
    const p = ref.current;
    if (!p || archiveState.enter < 0.001 || slotIdle(3)) return;
    if (archiveState.reduced) { mat.opacity = 0.4; return; } // static dust
    phase.current += dt * (1 + 2.2 * archiveState.pulse);
    const t = phase.current;
    mat.opacity = 0.3 + 0.4 * archiveState.pulse;
    mat.size = 0.03 + 0.02 * archiveState.pulse;
    const a = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      a.setY(i, base[i * 3 + 1] + Math.sin(t * 0.15 + i) * 0.25);
      a.setX(i, base[i * 3] + Math.cos(t * 0.1 + i * 1.7) * 0.15);
    }
    a.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
