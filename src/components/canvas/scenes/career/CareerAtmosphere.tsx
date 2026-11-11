"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { careerState } from "@/lib/careerState";
import type { CareerQuality } from "@/lib/careerTier";
import { makeShaftTexture, makeSoftSprite } from "./careerTextures";
import { slotIdle } from "@/lib/sceneGate";

/** [x, z, tilt] — soft crimson-white light shafts falling from the vault. */
const SHAFTS: [number, number, number][] = [[-8, -6, 0.12], [4, -10, -0.1], [12, -7, 0.14], [-17, -14, -0.08]];

/** Volumetric feel without volumetrics: additive shaft cards + a sparse layer of large, faint haze motes. */
export default function CareerAtmosphere({ q }: { q: CareerQuality }) {
  const lite = q.detail < 1;
  const haze = useRef<THREE.Points>(null);

  const tex = useMemo(() => ({ shaft: makeShaftTexture(), sprite: makeSoftSprite() }), []);
  const shaftGeo = useMemo(() => new THREE.PlaneGeometry(3.2, 22), []);
  const shaftMat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex.shaft, color: "#ff6674", transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), [tex]);
  const hazeObj = useMemo(() => {
    let seed = 5;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = lite ? 14 : 36;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (rnd() - 0.5) * 50; pos[i * 3 + 1] = (rnd() - 0.45) * 14; pos[i * 3 + 2] = -3 - rnd() * 26; }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ map: tex.sprite, color: "#ff4655", size: 2.4, sizeAttenuation: true, transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending });
    return { g, m };
  }, [lite, tex]);
  useEffect(() => () => { tex.shaft.dispose(); tex.sprite.dispose(); shaftGeo.dispose(); shaftMat.dispose(); hazeObj.g.dispose(); hazeObj.m.dispose(); }, [tex, shaftGeo, shaftMat, hazeObj]);

  useFrame((st) => {
    if (careerState.enter < 0.001 || slotIdle(2)) return;
    const t = st.clock.elapsedTime;
    const live = careerState.reduced ? 0 : 1;
    shaftMat.opacity = 0.06 + 0.02 * Math.sin(t * 0.35) * live + 0.025 * careerState.pulse;
    if (haze.current) haze.current.position.x = Math.sin(t * 0.04) * 1.8 * live;
  });

  const shafts = SHAFTS.slice(0, lite ? 2 : SHAFTS.length);
  return (
    <group name="career-atmosphere">
      {shafts.map(([x, z, tilt], i) => (
        <group key={i} position={[x, 8.5 - 11, z]} rotation={[0, 0, tilt]}>
          <mesh geometry={shaftGeo} material={shaftMat} />
          {!lite && <mesh geometry={shaftGeo} material={shaftMat} rotation={[0, Math.PI / 2, 0]} />}
        </group>
      ))}
      <points ref={haze} geometry={hazeObj.g} material={hazeObj.m} frustumCulled={false} />
    </group>
  );
}
