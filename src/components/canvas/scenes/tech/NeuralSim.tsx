"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { projectsOf, techIndex } from "@/data/technologies";
import { currentFocus, focusState, techState } from "@/lib/techState";
import { slotIdle } from "@/lib/sceneGate";
import { K_MAIN, K_RELATION, type NeuralModel } from "./neuralModel";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => x * x * (3 - 2 * x);

/** Hover / selection → target highlight per edge and per technology. Recomputed only when the focus store changes. */
function computeTargets(model: NeuralModel): number {
  const { rt, incident, lineage, relations } = model;
  rt.edgeTarget.fill(0);
  rt.techTarget.fill(0);
  const raise = (e: number, v: number) => { if (v > rt.edgeTarget[e]) rt.edgeTarget[e] = v; };
  const f = techIndex(currentFocus());
  const s = techIndex(focusState.selected);
  let dim = 0;
  if (f >= 0) {
    incident[f].forEach((e) => raise(e, 1)); // its own pathways
    lineage[f].forEach((e) => raise(e, 0.5)); // the route back to the root
    rt.techTarget[f] = 1;
  }
  if (s >= 0) {
    incident[s].forEach((e) => raise(e, 0.7));
    rt.techTarget[s] = Math.max(rt.techTarget[s], 0.95);
    const proj = focusState.project;
    for (const p of projectsOf(focusState.selected)) {
      if (proj && p.id !== proj) continue;
      for (const m of p.members) {
        const i = techIndex(m);
        if (i >= 0) rt.techTarget[i] = Math.max(rt.techTarget[i], proj ? 0.85 : 0.6);
      }
      relations.get(p.id)?.forEach((e) => raise(e, proj ? 1 : 0.65));
    }
    dim = 1; // everything not related recedes slightly
  }
  return dim;
}

/**
 * Runs first every frame (mounted before every renderer of the network). Owns all per-frame maths:
 * channel growth → edge draw-on and node visibility; focus → smoothed lit/focus values; HUD counters.
 * Components below only read `model.rt`.
 */
export default function NeuralSim({ model }: { model: NeuralModel }) {
  const seen = useRef(-1);
  const dimTarget = useRef(0);

  useFrame((_, dt) => {
    if (techState.enter < 0.001 || slotIdle(4)) return;
    const { rt, edges, nodes, stateBytes } = model;
    const reduced = techState.reduced;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 9);
    const kSlow = reduced ? 1 : 1 - Math.exp(-dt * 3.4);
    const G = techState.grow;

    if (seen.current !== focusState.version) {
      seen.current = focusState.version;
      dimTarget.current = computeTargets(model);
    }

    // edges
    let linksOn = 0;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      let grow: number;
      if (e.kind === K_RELATION) {
        const ready = rt.nodeVis[e.a] > 0.9 && rt.nodeVis[e.b] > 0.9;
        const target = ready && rt.edgeTarget[i] > 0 ? 1 : 0;
        rt.edgeGrow[i] += (target - rt.edgeGrow[i]) * kSlow;
        if (target === 0 && rt.edgeGrow[i] < 0.004) rt.edgeGrow[i] = 0;
        grow = rt.edgeGrow[i];
      } else {
        const span = e.end - e.start || 1;
        grow = smooth(clamp01((G[e.group] - e.start) / span));
        rt.edgeGrow[i] = grow;
        if (e.kind === K_MAIN && grow > 0.99) linksOn++;
      }
      rt.edgeLit[i] += (rt.edgeTarget[i] - rt.edgeLit[i]) * k;
      stateBytes[i * 4] = Math.round(grow * 255);
      stateBytes[i * 4 + 1] = Math.round(clamp01(rt.edgeLit[i]) * 255);
    }
    model.stateTex.needsUpdate = true;

    // nodes
    let nodesOn = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.kind === "via") rt.nodeVis[i] = smooth(clamp01((rt.edgeGrow[n.edge] - n.t) / 0.08));
      else if (n.kind === "root") rt.nodeVis[i] = smooth(clamp01(G[0] / 0.06));
      else rt.nodeVis[i] = smooth(clamp01((G[n.group] - (n.at - 0.08)) / 0.08)); // fades in over the last 8% of its connection
      if (n.kind === "tech" && rt.nodeVis[i] > 0.95) nodesOn++;
    }

    // focus smoothing
    for (let i = 0; i < rt.techFocus.length; i++) rt.techFocus[i] += (rt.techTarget[i] - rt.techFocus[i]) * k;
    rt.dim += (dimTarget.current - rt.dim) * k;

    const o = techState.online;
    o.nodes = nodesOn;
    o.links = linksOn;
    o.linksTotal = model.mainEdges.length;
  });
  return null;
}
