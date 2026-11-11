"use client";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { techState } from "@/lib/techState";
import { slotIdle } from "@/lib/sceneGate";
import { NEURAL_COLORS, TECH_FOV } from "./techConfig";
import { DUST_FRAG, DUST_VERT } from "./neuralShaders";

/** Sparse atmospheric dust through the whole depth of the network. One Points draw call; motion lives in the vertex shader. */
export default function NetworkParticles({ count }: { count: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3), seed = new Float32Array(count);
    let s = 7;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < count; i++) {
      pos[i * 3] = -9 + r() * 24; pos[i * 3 + 1] = -8 + r() * 14; pos[i * 3 + 2] = -9 + r() * 14;
      seed[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    return g;
  }, [count]);
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: {
        uTime: { value: 0 }, uScale: { value: 800 }, uMotion: { value: 1 }, uAlpha: { value: 0.2 },
        uColor: { value: new THREE.Color(NEURAL_COLORS.crimson) }, uWhite: { value: new THREE.Color(NEURAL_COLORS.metal) },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
    [],
  );
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  useFrame((s) => {
    if (techState.enter < 0.001 || slotIdle(4)) return;
    const u = mat.uniforms;
    u.uTime.value = s.clock.elapsedTime;
    u.uMotion.value = techState.reduced ? 0 : 1;
    u.uScale.value = (s.size.height * s.gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(TECH_FOV) / 2));
    u.uAlpha.value = 0.12 + 0.3 * Math.min(1, techState.grow[0] * 0.6 + techState.progress) + 0.12 * techState.final;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={0} />;
}
