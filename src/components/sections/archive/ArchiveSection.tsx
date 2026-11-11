"use client";
import { useMemo, useRef, type KeyboardEvent } from "react";
import Section from "@/components/layout/Section";
import { PROJECTS } from "@/data/projects";
import { goToProject, useArchiveSelection } from "@/lib/archiveState";
import { useCareerTier } from "@/lib/careerTier";
import ArchiveList from "./ArchiveList";
import ArchivePanel from "./ArchivePanel";
import ArchiveScrollController from "./ArchiveScrollController";
import CaseStudyDialog from "./CaseStudyDialog";
import styles from "./archive.module.css";

/**
 * Scene 04 — ENGINEERING ARCHIVE. Same tiering as Career: "list" (mobile / no WebGL / low power / SSR baseline) or the
 * pinned cinematic stage (desktop full 3D, tablet reduced 3D). The 6 panels stay mounted and stacked; GSAP reveals them,
 * React only toggles inert/aria-hidden on the active index.
 */
export default function ArchiveSection() {
  const stageRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLOListElement>(null);
  const index = useArchiveSelection();
  const tier = useCareerTier();
  const total = PROJECTS.length;
  const active = PROJECTS[Math.min(index, total - 1)];
  const panels = useMemo(() => PROJECTS.map((p, i) => <ArchivePanel key={p.id} project={p} index={i} total={total} />), [total]);

  const onKey = (e: KeyboardEvent) => {
    let to = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") to = Math.min(total - 1, index + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") to = Math.max(0, index - 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = total - 1;
    if (to < 0) return;
    e.preventDefault();
    goToProject(to);
    selRef.current?.querySelectorAll<HTMLButtonElement>("button")[to]?.focus();
  };

  return (
    <Section id="scene-04" index={3} label="Engineering archive" bare className={styles.root}>
      {tier === "list" ? (
        <ArchiveList />
      ) : (
        <>
          <a href="#archive-end" className={styles.skip}>Skip project showcase</a>
          <div ref={stageRef} className={styles.stage}>
            <div className={styles.shade} aria-hidden="true" />
            <header className={styles.head}>
              <p className={`${styles.eyebrow} label-mono`}><span className={styles.mark} aria-hidden="true" />04 / 06 — ENGINEERING ARCHIVE</p>
              <h2 className={styles.title}>ENGINEERING ARCHIVE</h2>
              <p className={`${styles.subtitle} label-mono`}>IDEAS TURNED INTO DIGITAL REALITY.</p>
            </header>

            <p className={styles.srOnly} role="status" aria-live="polite">Showing project {index + 1} of {total}: {active.name}. {active.tagline}</p>

            <div className={styles.body}>
              <div id="archive-panels" className={styles.panels}>
                {panels.map((panel, i) => (
                  <div key={PROJECTS[i].id} data-archive-panel={i} data-state={i === index ? "active" : "inactive"} className={styles.slot} inert={i !== index} aria-hidden={i !== index}>
                    {panel}
                  </div>
                ))}
              </div>
            </div>

            <ol ref={selRef} data-archive-selector className={styles.selector} aria-label="Projects" onKeyDown={onKey}>
              {PROJECTS.map((p, i) => (
                <li key={p.id} data-kind={p.kind} data-active={i === index || undefined}>
                  <button type="button" aria-current={i === index ? "step" : undefined} aria-controls="archive-panels" aria-label={`${p.name}, project ${i + 1} of ${total}`} onClick={() => goToProject(i)}>
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={`${styles.selName} label-mono`} aria-hidden="true">{String(i + 1).padStart(2, "0")} {p.name}</span>
                  </button>
                </li>
              ))}
            </ol>

            <ArchiveScrollController stageRef={stageRef} count={total} lite={tier === "lite"} />
          </div>
          <span id="archive-end" tabIndex={-1} />
        </>
      )}
      <CaseStudyDialog />
    </Section>
  );
}
