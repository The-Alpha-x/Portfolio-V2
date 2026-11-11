"use client";
import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { sceneState } from "@/lib/sceneState";

/** Test switch for Scene 03 (see CareerCanvas `careerDebug`): keeps its slot visible from any scroll position. */
export const forceCareer = typeof window !== "undefined" && (process.env.NEXT_PUBLIC_CAREER_DEBUG === "1" || new URLSearchParams(window.location.search).has("career3d"));

/** Wraps one scene's 3D content. Visible only when active or adjacent (for cross-fades). */
export default function SceneSlot({ index, children }: { index: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = Math.abs(sceneState.active - index) <= 1 || (index === 2 && forceCareer);
  });
  return (
    <group ref={ref} name={`scene-${index}`}>
      {children}
    </group>
  );
}
