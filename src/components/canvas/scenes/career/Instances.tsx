"use client";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

export interface Inst { p: [number, number, number]; s?: [number, number, number]; r?: [number, number, number] }

/** One draw call for many identical meshes. Matrices are written once (static architecture). */
export default function Instances({ geo, mat, items }: { geo: THREE.BufferGeometry; mat: THREE.Material; items: Inst[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.scale.set(...(it.s ?? [1, 1, 1]));
      o.rotation.set(...(it.r ?? [0, 0, 0]));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items]);
  return <instancedMesh key={items.length} ref={ref} args={[geo, mat, items.length]} frustumCulled={false} />;
}
