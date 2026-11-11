"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { careerState } from "@/lib/careerState";
import { CAREER_COLORS as C } from "./careerConfig";
import { makeSoftSprite } from "./careerTextures";
import { slotIdle } from "@/lib/sceneGate";

/** Sparse drifting dust. One Points draw call; positions generated once, drift done in the vertex buffer. */
export default function CareerParticles({ count = 220 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const phase = useRef(0);
  const { geo, mat, base, sprite } = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * 36;
      pos[i * 3 + 1] = (rnd() - 0.5) * 12;
      pos[i * 3 + 2] = (rnd() - 0.5) * 22 - 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const sprite = makeSoftSprite();
    const m = new THREE.PointsMaterial({
      map: sprite, color: C.crimson, size: 0.075, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo: g, mat: m, base: pos.slice(), sprite };
  }, [count]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); sprite.dispose(); }, [geo, mat, sprite]);

  useFrame((_, dt) => {
    const p = ref.current;
    if (!p || careerState.enter < 0.001 || slotIdle(2)) return; // hidden → skip the buffer update
    const drift = careerState.reduced ? 0 : 1; // reduced motion: static dust
    // Activity (careerState.pulse, GSAP-driven) speeds the drift and brightens the dust around node activations.
    const pulse = careerState.pulse;
    phase.current += dt * (1 + 2.5 * pulse) * drift;
    const t = phase.current;
    mat.opacity = 0.35 + 0.45 * pulse;
    mat.size = 0.065 + 0.04 * pulse;
    const a = geo.attributes.position as THREE.BufferAttribute;
    if (!drift) return;
    for (let i = 0; i < count; i++) {
      a.setY(i, base[i * 3 + 1] + Math.sin(t * 0.15 + i) * 0.25);
      a.setX(i, base[i * 3] + Math.cos(t * 0.1 + i * 1.7) * 0.15);
    }
    a.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}
