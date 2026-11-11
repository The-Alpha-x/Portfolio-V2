"use client";
import { useRef, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Section from "@/components/layout/Section";
import { PHASES, PHASE_COUNT } from "@/data/techStages";
import { TECH_CATEGORIES, techById, techsIn } from "@/data/technologies";
import { clearSelection, goToPhase, useTechFocus } from "@/lib/techState";
import { useCareerTier } from "@/lib/careerTier";
import TechList from "./TechList";
import TechHeading from "./TechHeading";
import TechnologyCategory from "./TechnologyCategory";
import TechnologyInformationPanel from "./TechnologyInformationPanel";
import TechHotspots from "./TechHotspots";
// The scroll controller is only needed by the 3D tiers; the list tier (phones, no WebGL, low power) never loads it.
const TechScrollController = dynamic(() => import("./TechScrollController"), { ssr: false });
import styles from "./tech.module.css";

/** Left-hand interface: the active phase, the active category, and its technologies. */
function Interface() {
  const { phase, selected } = useTechFocus();
  const p = PHASES[phase];
  const cats = new Set(p.cats);
  const sel = techById(selected);
  if (sel) cats.add(sel.category); // a locked technology always stays reachable in its own category
  const shown = TECH_CATEGORIES.filter((c) => cats.has(c.id));
  const all = p.cats.length === TECH_CATEGORIES.length;
  const active = p.cats.length === 0 ? "—" : all ? "ALL CATEGORIES" : p.cats.map((id) => TECH_CATEGORIES.find((c) => c.id === id)?.label).join(" + ");

  return (
    <div className={styles.left}>
      <p className={`${styles.phase} label-mono`}>
        <span className={styles.mark} aria-hidden="true" />PHASE {String(phase + 1).padStart(2, "0")} — {p.label}
      </p>
      <p className={`${styles.active} label-mono`}>ACTIVE CATEGORY <b>{active}</b></p>
      <div className={styles.cats} tabIndex={-1}>
        {shown.length === 0 ? (
          <div className={styles.boot}>
            <p>{p.note}</p>
            <ul className={`${styles.queue} label-mono`} aria-label="Subsystems queued">
              {TECH_CATEGORIES.map((c) => <li key={c.id}>{c.label}<span>{String(techsIn(c.id).length).padStart(2, "0")}</span></li>)}
            </ul>
          </div>
        ) : shown.map((c) => <TechnologyCategory key={c.id} category={c} dense={all} />)}
      </div>
    </div>
  );
}

/** Scene 05 — TECHNICAL ARSENAL · NEURAL ARCHITECTURE. "list" tier (phones / no WebGL / low power / SSR) or the pinned 3D stage. */
export default function TechArsenal() {
  const stageRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLOListElement>(null);
  const tier = useCareerTier();
  const { phase } = useTechFocus();

  const onRailKey = (e: KeyboardEvent) => {
    let to = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") to = Math.min(PHASE_COUNT - 1, phase + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = Math.max(0, phase - 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = PHASE_COUNT - 1;
    if (to < 0) return;
    e.preventDefault();
    goToPhase(to);
    railRef.current?.querySelectorAll<HTMLButtonElement>("button")[to]?.focus();
  };

  return (
    <Section id="scene-05" index={4} label="Technical arsenal" bare className={styles.root}>
      {tier === "list" ? <TechList /> : (
        <>
          <a href="#tech-end" className={styles.skip}>Skip technical arsenal</a>
          <div ref={stageRef} className={styles.stage} onKeyDown={(e) => { if (e.key === "Escape") clearSelection(); }}>
            <div className={styles.shade} aria-hidden="true" />
            <TechHotspots />
            <div className={styles.column}>
              <TechHeading animate />
              <p className={styles.srOnly} role="status" aria-live="polite">Phase {phase + 1} of {PHASE_COUNT}: {PHASES[phase].label}.</p>
              <Interface />
            </div>
            <TechnologyInformationPanel />
            <ol ref={railRef} data-tech-selector className={styles.selector} aria-label="Architecture phases" onKeyDown={onRailKey}>
              {PHASES.map((s, i) => (
                <li key={s.id} data-active={i === phase || undefined}>
                  <button type="button" aria-current={i === phase ? "step" : undefined} aria-label={`${s.short}, phase ${i + 1} of ${PHASE_COUNT}`} onClick={() => goToPhase(i)}>
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={`${styles.selName} label-mono`} aria-hidden="true">{String(i + 1).padStart(2, "0")} {s.short}</span>
                  </button>
                </li>
              ))}
            </ol>
            <TechScrollController stageRef={stageRef} lite={tier === "lite"} />
          </div>
          <span id="tech-end" tabIndex={-1} />
        </>
      )}
    </Section>
  );
}
