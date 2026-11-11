"use client";
import { useCallback, type MouseEvent } from "react";
import { useLenis } from "@/providers/SmoothScrollProvider";
import { prefersReducedMotion } from "@/lib/animations";

/** Smooth-scroll to an in-page anchor via Lenis; falls back to native when Lenis is off. */
export function useAnchorScroll() {
  const lenis = useLenis();
  return useCallback(
    (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      const el = document.querySelector<HTMLElement>(href);
      if (!el) return; // target scene not built yet → leave default behaviour
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { duration: Math.min(3.6, 1.2 + (Math.abs(el.getBoundingClientRect().top) / window.innerHeight) * 0.12) }); // longer trips = slightly longer glide, never a teleport
      else el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    },
    [lenis]
  );
}
