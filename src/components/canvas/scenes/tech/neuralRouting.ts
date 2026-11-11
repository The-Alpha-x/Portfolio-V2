import { QuadraticBezierCurve3, Quaternion, Vector3 } from "three";
import type { Vec3 } from "@/data/neuralNetwork";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hashString = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const smooth = (x: number) => x * x * (3 - 2 * x);

/**
 * PCB-style trace in the screen (x, y) plane: straight run · 45° chamfer · straight run. `f` (0–1) decides how much of the straight
 * length comes before the chamfer. Depth (z) eases between the end points so traces step between layers.
 */
export function routeTrace(a: Vec3, b: Vec3, f: number, easeZ = true): Vector3[] {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const U = horizontal ? dx : dy, V = horizontal ? dy : dx;
  const su = Math.sign(U) || 1, sv = Math.sign(V) || 1;
  const mu = Math.abs(U), mv = Math.abs(V);
  const leg1 = (mu - mv) * f;
  const at = (u: number, v: number): [number, number] => (horizontal ? [a[0] + u, a[1] + v] : [a[0] + v, a[1] + u]);
  const flat: [number, number][] = [at(0, 0)];
  if (mv > 1e-3) {
    if (leg1 > 1e-3) flat.push(at(su * leg1, 0));
    flat.push(at(su * (leg1 + mv), sv * mv));
  }
  flat.push(at(U, V));
  const pts: [number, number][] = [];
  for (const p of flat) {
    const q = pts[pts.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) pts.push(p);
  }
  if (pts.length < 2) pts.push([b[0], b[1]]);
  let total = 0;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(total); }
  return pts.map((p, i) => {
    const s = total > 1e-4 ? cum[i] / total : i / (pts.length - 1);
    return new Vector3(p[0], p[1], a[2] + (b[2] - a[2]) * (easeZ ? smooth(s) : s));
  });
}

/** Lifted arc between two points (used for project relationships). */
export function arcPath(a: Vector3, b: Vector3, segs = 28): Vector3[] {
  const d = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y += 0.9 + d * 0.16;
  mid.z += 0.9 + d * 0.05;
  return new QuadraticBezierCurve3(a.clone(), mid, b.clone()).getPoints(segs);
}

export interface TubeBuffers { pos: number[]; s: number[]; tot: number[]; edge: number[]; kind: number[]; idx: number[] }
export const newTubeBuffers = (): TubeBuffers => ({ pos: [], s: [], tot: [], edge: [], kind: [], idx: [] });

export const pathLength = (pts: Vector3[]) => { let l = 0; for (let i = 1; i < pts.length; i++) l += pts[i].distanceTo(pts[i - 1]); return l; };

/** Appends a thin tube along `pts` (parallel-transport frames, mitred ring size at bends). One shared buffer → one draw call. */
export function appendTube(pts: Vector3[], radius: number, sides: number, edge: number, kind: number, out: TubeBuffers) {
  const n = pts.length;
  if (n < 2) return;
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = cum[n - 1];
  const dirs: Vector3[] = [];
  for (let i = 0; i < n - 1; i++) dirs.push(pts[i + 1].clone().sub(pts[i]).normalize());
  const base = out.pos.length / 3;
  let prevT: Vector3 | null = null;
  const nrm = new Vector3(), bin = new Vector3(), q = new Quaternion();
  for (let i = 0; i < n; i++) {
    const t = (i === 0 ? dirs[0].clone() : i === n - 1 ? dirs[n - 2].clone() : dirs[i - 1].clone().add(dirs[i]).normalize());
    const miter = i === 0 || i === n - 1 ? 1 : Math.min(1.6, 1 / Math.max(0.55, t.dot(dirs[i])));
    if (!prevT) {
      const ax = Math.abs(t.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      nrm.crossVectors(t, ax).normalize();
    } else {
      q.setFromUnitVectors(prevT, t);
      nrm.applyQuaternion(q);
      nrm.addScaledVector(t, -nrm.dot(t)).normalize();
    }
    bin.crossVectors(t, nrm).normalize();
    prevT = t;
    for (let k = 0; k < sides; k++) {
      const th = (k / sides) * Math.PI * 2, c = Math.cos(th) * radius * miter, s2 = Math.sin(th) * radius * miter;
      out.pos.push(pts[i].x + nrm.x * c + bin.x * s2, pts[i].y + nrm.y * c + bin.y * s2, pts[i].z + nrm.z * c + bin.z * s2);
      out.s.push(cum[i]); out.tot.push(total); out.edge.push(edge); out.kind.push(kind);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a = base + i * sides + k, b = base + i * sides + ((k + 1) % sides);
      const c = base + (i + 1) * sides + k, d = base + (i + 1) * sides + ((k + 1) % sides);
      out.idx.push(a, b, c, b, d, c);
    }
  }
}
