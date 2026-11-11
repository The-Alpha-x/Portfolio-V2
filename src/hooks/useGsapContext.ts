"use client";
import { useEffect, useLayoutEffect, type DependencyList, type RefObject } from "react";
import { gsap } from "@/lib/gsap";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Scoped gsap.context with automatic cleanup (kills tweens + ScrollTriggers). */
export function useGsapContext(scope: RefObject<HTMLElement | null>, setup: (ctx: gsap.Context) => void, deps: DependencyList = []) {
  useIsoLayoutEffect(() => {
    const ctx = gsap.context((self) => setup(self), scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
