"use client";
import { useEffect, useMemo } from "react";
import { buildNeuralModel } from "./neuralModel";
import type { TechQuality } from "./techConfig";
import NeuralSim from "./NeuralSim";
import NeuralEnvironment from "./NeuralEnvironment";
import NeuralPathway from "./NeuralPathway";
import NeuralNode from "./NeuralNode";
import TechnologyNode from "./TechnologyNode";
import NetworkParticles from "./NetworkParticles";

/** Scene 05 content: the branching neural architecture. Order matters — NeuralSim must run first each frame. */
export default function NeuralNetworkScene({ q }: { q: TechQuality }) {
  const model = useMemo(() => buildNeuralModel(q), [q]);
  useEffect(() => () => model.dispose(), [model]);
  return (
    <>
      <NeuralSim model={model} />
      <NeuralEnvironment model={model} q={q} />
      <NeuralPathway model={model} />
      <NeuralNode model={model} halos={q.halos} />
      <TechnologyNode model={model} />
      <NetworkParticles count={q.particles} />
    </>
  );
}
