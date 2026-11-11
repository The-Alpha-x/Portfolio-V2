"use client";
import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { connectState } from "@/lib/connectState";
import { slotIdle } from "@/lib/sceneGate";
import { emberFragment, emberVertex } from "./shaders";

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sparse embers that stay after the machinery dies — brighter once the portrait is back. */
export default function ConnectEmbers({ count }: { count: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    const rnd = mulberry32(61);
    const box = new THREE.Vector3(18, 10, 5);
    const pos = new Float32Array(count * 3), seed = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos.set([(rnd() - 0.5) * box.x, (rnd() - 0.5) * box.y, -1.5 + rnd() * 4], i * 3);
      seed.set([rnd(), rnd(), rnd()], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uBox: { value: box }, uOpacity: { value: 0 } },
      vertexShader: emberVertex, fragmentShader: emberFragment, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    if (connectState.enter < 0.001 || slotIdle(5)) return;
    const u = material.uniforms;
    u.uTime.value = connectState.reduced ? 0 : state.clock.elapsedTime;
    u.uPixelRatio.value = dpr;
    u.uOpacity.value = 0.25 + 0.55 * connectState.portrait;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />;
}
