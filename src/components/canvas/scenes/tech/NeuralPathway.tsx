"use client";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { techState } from "@/lib/techState";
import { slotIdle } from "@/lib/sceneGate";
import { NEURAL_COLORS } from "./techConfig";
import { PATH_FRAG, PATH_VERT } from "./neuralShaders";
import type { NeuralModel } from "./neuralModel";

/**
 * Every circuit trace (branches, trunks, cross-links, logo stems, project arcs, backdrop circuitry) as ONE mesh / ONE draw call.
 * Per-edge draw-on and highlight are read from the state texture by the vertex shader; energy pulses are computed in the fragment shader.
 */
export default function NeuralPathway({ model }: { model: NeuralModel }) {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: PATH_VERT,
      fragmentShader: PATH_FRAG,
      uniforms: {
        uState: { value: model.stateTex },
        uTime: { value: 0 }, uPulse: { value: 0 }, uFinal: { value: 0 },
        uColor: { value: new THREE.Color(NEURAL_COLORS.crimson) },
        uHot: { value: new THREE.Color(NEURAL_COLORS.hot) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
    [model],
  );
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((s) => {
    if (techState.enter < 0.001 || slotIdle(4)) return;
    const u = mat.uniforms;
    u.uTime.value = techState.reduced ? 0 : s.clock.elapsedTime;
    u.uPulse.value = techState.pulse;
    u.uFinal.value = techState.final;
  });

  return <mesh geometry={model.geometry} material={mat} frustumCulled={false} renderOrder={1} />;
}
