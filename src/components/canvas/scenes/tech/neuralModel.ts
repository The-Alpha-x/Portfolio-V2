import * as THREE from "three";
import { PROJECT_STACKS, TECHNOLOGIES, TECH_CATEGORIES, TECH_COUNT, TECH_LINKS, techIndex, techsIn } from "@/data/technologies";
import {
  BACKDROP_PANELS, CROSS_LINKS, GROUP_COUNT, PANEL_DEPTH, STRUCT_NODES, TECH_POSITIONS, TRUNKS, groupIndex, hubId,
  type NetworkGroup, type Vec3,
} from "@/data/neuralNetwork";
import { EDGE_TEX_W, LOGO_LIFT, type TechQuality } from "./techConfig";
import { appendTube, arcPath, hashString, mulberry32, newTubeBuffers, pathLength, routeTrace } from "./neuralRouting";

/** Edge kinds (also the `aKind` shader attribute). */
export const K_MAIN = 0, K_RELATION = 1, K_DECOR = 2, K_STEM = 3;

export interface NodeRec {
  id: string;
  kind: "root" | "relay" | "hub" | "tech" | "via";
  pos: THREE.Vector3;
  /** growth channel that reveals it */
  group: number;
  /** channel progress (0–1) at which it appears */
  at: number;
  /** technology index, or −1 */
  tech: number;
  /** category index for hubs, or −1 */
  cat: number;
  /** vias only: owning edge and position along it (0–1) */
  edge: number;
  t: number;
}
export interface EdgeRec {
  id: string;
  kind: number;
  group: number;
  start: number;
  end: number;
  points: THREE.Vector3[];
  length: number;
  a: number;
  b: number;
  project: string;
}
export interface DecorPad { pos: THREE.Vector3; group: number; at: number }
export interface DecorIc { pos: THREE.Vector3; w: number; h: number; group: number; at: number }
export interface Cluster { cat: number; group: number; min: THREE.Vector2; max: THREE.Vector2; z: number }

export interface NeuralModel {
  nodes: NodeRec[];
  edges: EdgeRec[];
  techNode: number[];
  hubNode: number[];
  geometry: THREE.BufferGeometry;
  stateBytes: Uint8Array;
  stateTex: THREE.DataTexture;
  /** per technology: edges touching its node (+ its stem) / edges from it up to the root */
  incident: number[][];
  lineage: number[][];
  /** project id → relation-arc edge indices */
  relations: Map<string, number[]>;
  mainEdges: number[];
  pads: DecorPad[];
  ics: DecorIc[];
  floating: THREE.Vector3[];
  clusters: Cluster[];
  /** mutable per-frame state shared by the components (written by NeuralSim) */
  rt: {
    edgeGrow: Float32Array;
    edgeLit: Float32Array;
    edgeTarget: Float32Array;
    nodeVis: Float32Array;
    techFocus: Float32Array;
    techTarget: Float32Array;
    dim: number;
  };
  dispose(): void;
}

const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2]);

function decorGroup(x: number, y: number): number {
  if (x < -3.5) return groupIndex("root");
  if (x < 2) return groupIndex("frontend");
  if (x < 6.5) return groupIndex("backend");
  if (x < 9.5) return y < -3 ? groupIndex("tools") : groupIndex("data");
  return groupIndex("integrations");
}

export function buildNeuralModel(q: TechQuality): NeuralModel {
  const nodes: NodeRec[] = [];
  const edges: EdgeRec[] = [];
  const nodeIndex = new Map<string, number>();
  const parentEdge: number[] = [];
  const parentNode: number[] = [];

  const addNode = (n: Partial<NodeRec> & Pick<NodeRec, "id" | "kind" | "pos">) => {
    nodeIndex.set(n.id, nodes.length);
    nodes.push({ group: 0, at: 0, tech: -1, cat: -1, edge: -1, t: 0, ...n });
    parentEdge.push(-1);
    parentNode.push(-1);
    return nodes.length - 1;
  };

  /* 1 ── nodes */
  for (const s of STRUCT_NODES) {
    addNode({ id: s.id, kind: s.kind, pos: v3(s.pos), cat: s.category ? TECH_CATEGORIES.findIndex((c) => c.id === s.category) : -1 });
  }
  const techNode: number[] = TECHNOLOGIES.map((t, i) => {
    const p = TECH_POSITIONS[t.id];
    if (!p && process.env.NODE_ENV !== "production") console.warn(`[neural] no position for "${t.id}"`);
    return addNode({ id: t.id, kind: "tech", pos: v3(p ?? [0, 0, 0]), tech: i, group: groupIndex(t.category) });
  });
  const hubNode = TECH_CATEGORIES.map((c) => nodeIndex.get(hubId(c.id)) ?? 0);

  /* 2 ── main connections */
  const addEdge = (id: string, kind: number, group: number, start: number, end: number, points: THREE.Vector3[], a: number, b: number, project = "") => {
    edges.push({ id, kind, group, start, end, points, length: pathLength(points), a, b, project });
    return edges.length - 1;
  };
  const routed = (a: number, b: number, id: string) => {
    const r = mulberry32(hashString(id));
    const f = r() < 0.28 ? (r() < 0.5 ? 0.08 : 0.92) : 0.22 + 0.56 * r();
    const pa = nodes[a].pos, pb = nodes[b].pos;
    return routeTrace([pa.x, pa.y, pa.z], [pb.x, pb.y, pb.z], f);
  };
  const connect = (from: string, to: string, group: NetworkGroup, win: readonly [number, number], parent: boolean) => {
    const a = nodeIndex.get(from), b = nodeIndex.get(to);
    if (a === undefined || b === undefined) { if (process.env.NODE_ENV !== "production") console.warn(`[neural] bad connection ${from}>${to}`); return -1; }
    const g = groupIndex(group);
    const e = addEdge(`${from}>${to}`, K_MAIN, g, win[0], win[1], routed(a, b, `${from}>${to}`), a, b);
    if (parent) {
      nodes[b].group = g;
      nodes[b].at = win[1];
      parentEdge[b] = e;
      parentNode[b] = a;
    }
    return e;
  };

  for (const t of TRUNKS) connect(t.from, t.to, t.group, t.window, true);
  // root appears with the first sliver of growth
  nodes[nodeIndex.get("root") ?? 0].at = 0;

  for (const cat of TECH_CATEGORIES) {
    const list = techsIn(cat.id);
    const s0 = cat.id === "frontend" ? 0.0 : 0.38;
    const len = 0.34;
    list.forEach((t, i) => {
      const start = s0 + (0.63 - s0) * (list.length > 1 ? i / (list.length - 1) : 0);
      connect(hubId(cat.id), t.id, cat.id, [start, Math.min(1, start + len)], true);
    });
  }
  for (const [a, b] of TECH_LINKS) {
    const na = nodeIndex.get(a), nb = nodeIndex.get(b);
    if (na === undefined || nb === undefined) continue;
    const at = Math.max(nodes[na].at, nodes[nb].at);
    const group = nodes[nb].group >= nodes[na].group ? nodes[nb].group : nodes[na].group;
    const start = Math.min(0.78, at), end = Math.min(1, start + 0.22);
    connect(a, b, ["root", "frontend", "backend", "data", "tools", "integrations"][group] as NetworkGroup, [start, end], false);
  }
  for (const c of CROSS_LINKS) connect(c.from, c.to, "integrations", c.window, false);
  const mainEdges = edges.map((_, i) => i);

  /* 3 ── vias at the bends of long traces (small structural nodes that light up as the trace passes) */
  edges.forEach((e, ei) => {
    if (e.length < 3 || e.points.length < 3) return;
    let acc = 0;
    const cum = e.points.map((p, i) => (i === 0 ? 0 : (acc += p.distanceTo(e.points[i - 1]))));
    for (let i = 1; i < e.points.length - 1 && i <= 2; i++) {
      addNode({ id: `via:${e.id}:${i}`, kind: "via", pos: e.points[i].clone(), group: e.group, edge: ei, t: cum[i] / acc });
    }
  });

  /* 4 ── logo stems: chip → floating logo */
  TECHNOLOGIES.forEach((_, i) => {
    const n = nodes[techNode[i]];
    const start = Math.min(0.86, n.at), end = Math.min(1, start + 0.14);
    addEdge(`stem:${n.id}`, K_STEM, n.group, start, end, [n.pos.clone().add(new THREE.Vector3(0, 0.07, 0)), n.pos.clone().add(new THREE.Vector3(0, LOGO_LIFT - 0.5, 0))], techNode[i], techNode[i]);
  });

  /* 5 ── project relationship arcs (hidden until a technology of that project is selected) */
  const relations = new Map<string, number[]>();
  for (const p of PROJECT_STACKS) {
    const list: number[] = [];
    for (const [a, b] of p.chain) {
      const na = nodeIndex.get(a), nb = nodeIndex.get(b);
      if (na === undefined || nb === undefined) continue;
      const lift = new THREE.Vector3(0, LOGO_LIFT, 0);
      list.push(addEdge(`rel:${p.id}:${a}>${b}`, K_RELATION, 0, 0, 1, arcPath(nodes[na].pos.clone().add(lift), nodes[nb].pos.clone().add(lift)), na, nb, p.id));
    }
    relations.set(p.id, list);
  }

  /* 6 ── backdrop circuitry: decorative traces, pads, IC packages, floating parts */
  const rnd = mulberry32(2026);
  const panels = BACKDROP_PANELS.slice(0, q.panels);
  const pads: DecorPad[] = [];
  for (let k = 0; k < q.decor; k++) {
    const P = panels[k % panels.length];
    const z = P.z + PANEL_DEPTH + 0.012;
    const ax = P.cx + (rnd() - 0.5) * (P.w - 2), ay = P.cy + (rnd() - 0.5) * (P.h - 2);
    const ang = rnd() * Math.PI * 2, len = 2 + rnd() * 4.5;
    const bx = THREE.MathUtils.clamp(ax + Math.cos(ang) * len, P.cx - P.w / 2 + 0.8, P.cx + P.w / 2 - 0.8);
    const by = THREE.MathUtils.clamp(ay + Math.sin(ang) * len, P.cy - P.h / 2 + 0.8, P.cy + P.h / 2 - 0.8);
    if (Math.hypot(bx - ax, by - ay) < 1.2) continue;
    const g = decorGroup(ax, ay);
    const s = rnd() * 0.55, e = s + 0.3 + rnd() * 0.15;
    addEdge(`decor:${k}`, K_DECOR, g, s, Math.min(1, e), routeTrace([ax, ay, z], [bx, by, z], 0.2 + 0.6 * rnd(), false), -1, -1);
    pads.push({ pos: new THREE.Vector3(ax, ay, z), group: g, at: s }, { pos: new THREE.Vector3(bx, by, z), group: g, at: Math.min(1, e) });
  }
  const ics: DecorIc[] = [];
  for (let i = 0; i < q.ics; i++) {
    const P = panels[i % panels.length];
    const x = P.cx + (rnd() - 0.5) * (P.w - 4), y = P.cy + (rnd() - 0.5) * (P.h - 3);
    ics.push({ pos: new THREE.Vector3(x, y, P.z + PANEL_DEPTH + 0.09), w: 1 + rnd() * 1.1, h: 0.7 + rnd() * 0.7, group: decorGroup(x, y), at: rnd() * 0.5 });
  }
  const floating: THREE.Vector3[] = [];
  for (let i = 0; i < q.floating; i++) floating.push(new THREE.Vector3(-6 + rnd() * 19, -6 + rnd() * 11, -7.6 + rnd() * 1.2)); // behind every node (z ≤ −5.6)

  if (edges.length > EDGE_TEX_W) throw new Error(`[neural] ${edges.length} edges exceed the ${EDGE_TEX_W}-slot state texture`);

  /* 7 ── merged tube geometry (one draw call) */
  const buf = newTubeBuffers();
  const radius = [0.026, 0.036, 0.012, 0.018];
  edges.forEach((e, i) => appendTube(e.points, radius[e.kind], q.sides, i, e.kind, buf));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(buf.pos, 3));
  geometry.setAttribute("aS", new THREE.Float32BufferAttribute(buf.s, 1));
  geometry.setAttribute("aTot", new THREE.Float32BufferAttribute(buf.tot, 1));
  geometry.setAttribute("aEdge", new THREE.Float32BufferAttribute(buf.edge, 1));
  geometry.setAttribute("aKind", new THREE.Float32BufferAttribute(buf.kind, 1));
  geometry.setIndex(buf.idx);

  const stateBytes = new Uint8Array(EDGE_TEX_W * 4);
  const stateTex = new THREE.DataTexture(stateBytes, EDGE_TEX_W, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  stateTex.minFilter = THREE.NearestFilter;
  stateTex.magFilter = THREE.NearestFilter;
  stateTex.generateMipmaps = false;
  stateTex.needsUpdate = true;

  /* 8 ── adjacency for hover / selection */
  const incident: number[][] = TECHNOLOGIES.map(() => []);
  const lineage: number[][] = TECHNOLOGIES.map(() => []);
  edges.forEach((e, ei) => {
    if (e.kind !== K_MAIN && e.kind !== K_STEM) return;
    for (const n of [e.a, e.b]) { const t = nodes[n]?.tech ?? -1; if (t >= 0 && !incident[t].includes(ei)) incident[t].push(ei); }
  });
  techNode.forEach((n0, i) => {
    let n = n0;
    for (let guard = 0; guard < 12 && parentEdge[n] >= 0; guard++) { lineage[i].push(parentEdge[n]); n = parentNode[n]; }
  });

  /* 9 ── hologram clusters (one per category) */
  const clusters: Cluster[] = TECH_CATEGORIES.map((c, ci) => {
    const ids = techsIn(c.id).map((t) => nodes[techNode[techIndex(t.id)]].pos);
    const min = new THREE.Vector2(Infinity, Infinity), max = new THREE.Vector2(-Infinity, -Infinity);
    let z = 0;
    for (const p of ids) { min.x = Math.min(min.x, p.x); min.y = Math.min(min.y, p.y); max.x = Math.max(max.x, p.x); max.y = Math.max(max.y, p.y + LOGO_LIFT); z += p.z; }
    return { cat: ci, group: groupIndex(c.id), min: min.subScalar(1.5), max: max.addScalar(1.5), z: z / Math.max(1, ids.length) - 0.8 };
  });

  const rt = {
    edgeGrow: new Float32Array(edges.length),
    edgeLit: new Float32Array(edges.length),
    edgeTarget: new Float32Array(edges.length),
    nodeVis: new Float32Array(nodes.length),
    techFocus: new Float32Array(TECH_COUNT),
    techTarget: new Float32Array(TECH_COUNT),
    dim: 0,
  };

  return {
    nodes, edges, techNode, hubNode, geometry, stateBytes, stateTex, incident, lineage, relations, mainEdges, pads, ics, floating, clusters, rt,
    dispose() { geometry.dispose(); stateTex.dispose(); },
  };
}

export const GROUPS = GROUP_COUNT;
