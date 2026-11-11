import { useEffect, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CAREER_COLORS as C } from "./careerConfig";

export interface CareerMaterials {
  metal: THREE.MeshStandardMaterial;
  darkMetal: THREE.MeshStandardMaterial;
  crimson: THREE.MeshStandardMaterial;
  crimsonDim: THREE.MeshStandardMaterial;
  dispose: () => void;
}

/** Local environment map (no network, applied to our materials only — scene.environment is untouched). */
export function createEnvMap(gl: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const rt = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  return rt;
}

export function createCareerMaterials(envMap: THREE.Texture | null): CareerMaterials {
  const common = { envMap, envMapIntensity: 0.45 };
  const metal = new THREE.MeshStandardMaterial({ color: C.metal, metalness: 1, roughness: 0.32, ...common });
  const darkMetal = new THREE.MeshStandardMaterial({ color: C.gunmetal, metalness: 0.9, roughness: 0.5, ...common });
  const crimson = new THREE.MeshStandardMaterial({
    color: C.crimsonDeep, emissive: C.crimson, emissiveIntensity: 2.2, metalness: 0.2, roughness: 0.4, toneMapped: true,
  });
  const crimsonDim = crimson.clone();
  crimsonDim.emissiveIntensity = 0.9;
  const all = [metal, darkMetal, crimson, crimsonDim];
  return { metal, darkMetal, crimson, crimsonDim, dispose: () => all.forEach((m) => m.dispose()) };
}

/**
 * Env map + shared materials, created in an effect (NOT useMemo). React StrictMode (dev) runs effect cleanup and re-runs the
 * effect while keeping memoised values — a memoised PMREM render target would be disposed and then reused as an empty
 * (black) env map. Returns null for the first frame; callers render their children once it is ready.
 */
export function useCareerAssets(gl: THREE.WebGLRenderer) {
  const [assets, setAssets] = useState<{ env: THREE.WebGLRenderTarget; mats: CareerMaterials } | null>(null);
  useEffect(() => {
    const env = createEnvMap(gl);
    const mats = createCareerMaterials(env.texture);
    setAssets({ env, mats });
    return () => { setAssets(null); mats.dispose(); env.dispose(); };
  }, [gl]);
  return assets;
}
