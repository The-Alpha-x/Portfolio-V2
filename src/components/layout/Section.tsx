"use client";
import { useRef, type ReactNode } from "react";
import { useGsapContext } from "@/hooks/useGsapContext";
import { createSceneTrigger, revealAll } from "@/lib/animations";

interface SectionProps {
  /** 0–5. Links this section to its 3D scene slot. */
  index: number;
  id: string;
  /** Accessible name for the section landmark. */
  label?: string;
  className?: string;
  /**
   * Opt out of the default full-screen flex/padding shell.
   * Used by scenes that own their layout (e.g. a hero with a sticky stage). Default: false.
   */
  bare?: boolean;
  children: ReactNode;
}

/**
 * Full-screen scene section. HTML lives above the persistent canvas (z-10),
 * stays fully readable/selectable, and self-registers with the scroll → 3D bridge.
 * Any child with [data-reveal] is auto-animated.
 */
export default function Section({ index, id, label, className = "", bare = false, children }: SectionProps) {
  const ref = useRef<HTMLElement>(null);

  useGsapContext(ref, () => {
    if (!ref.current) return;
    createSceneTrigger(ref.current, index);
    revealAll(ref.current);
  }, [index]);

  const shell = bare
    ? "relative z-10 w-full"
    : "relative z-10 flex min-h-svh w-full flex-col justify-center px-[var(--section-pad-x)] py-[var(--section-pad-y)]";

  return (
    <section ref={ref} id={id} data-scene={index} aria-label={label} className={`${shell} ${className}`}>
      {children}
    </section>
  );
}
