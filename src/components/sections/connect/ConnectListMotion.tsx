"use client";
import { useEffect, type RefObject } from "react";
import { gsap } from "@/lib/gsap";

/** "list" tier (mobile / no WebGL / low power): no pin, no 3D — each block simply rises in as it scrolls into view. Reverted on unmount / tier change. */
export default function ConnectListMotion({ stageRef }: { stageRef: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      stage.querySelectorAll("[data-c-title], [data-c-headline], [data-c-item], [data-c-actions]").forEach((el) => {
        gsap.from(el, { autoAlpha: 0, y: 24, duration: 0.9, scrollTrigger: { trigger: el, start: "top 90%", once: true } });
      });
    });
    return () => mm.revert();
  }, [stageRef]);
  return null;
}
