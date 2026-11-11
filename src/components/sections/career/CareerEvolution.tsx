"use client";
import { useMemo, useRef } from "react";
import Section from "@/components/layout/Section";
import { CAREER, formatPeriod } from "@/data/career";
import { useCareerSelection } from "@/lib/careerSelection";
import { goToCareer } from "@/lib/careerScroll";
import CareerTimeline from "./CareerTimeline";
import CareerInformation from "./CareerInformation";
import { useCareerTier } from "@/lib/careerTier";
import CareerList from "./CareerList";
import CareerScrollController from "./CareerScrollController";
import styles from "./career.module.css";

/**
 * Scene 03 — CAREER EVOLUTION. Pinned, scroll-driven stage (see CareerScrollController).
 * All three information panels are mounted and stacked; GSAP reveals them, React only marks the active one
 * (`inert` + aria-hidden for the rest), so the DOM is never rebuilt during scroll.
 * Without scroll mode (reduced motion / no JS) the stage is a normal layout showing only the selected panel.
 */
export default function CareerEvolution() {
  const stageRef = useRef<HTMLDivElement>(null);
  const { index } = useCareerSelection(CAREER.length);
  const entry = CAREER[index];
  const tier = useCareerTier();

  // Stable handlers → memoised CareerInformation panels don't re-render on every selection change.
  const nav = useMemo(
    () =>
      CAREER.map((_, i) => ({
        onPrev: i > 0 ? () => goToCareer(i - 1) : undefined,
        onNext: i < CAREER.length - 1 ? () => goToCareer(i + 1) : undefined,
        prevLabel: i > 0 ? `${CAREER[i - 1].company}, ${CAREER[i - 1].startDate}` : undefined,
        nextLabel: i < CAREER.length - 1 ? `${CAREER[i + 1].company}, ${CAREER[i + 1].startDate}` : undefined,
      })),
    []
  );

  if (tier === "list") {
    return (
      <Section id="scene-03" index={2} label="Career evolution" bare className={`${styles.root} ${styles.listAtmos}`}>
        <CareerList />
      </Section>
    );
  }

  return (
    <Section id="scene-03" index={2} label="Career evolution" bare className={styles.root}>
      <a href="#career-end" className={styles.skip}>Skip career timeline</a>
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.shade} aria-hidden="true" />

        <header className={styles.head}>
          <p className={`${styles.eyebrow} label-mono`}>
            <span className={styles.mark} aria-hidden="true" />
            03 / 06 — CAREER EVOLUTION
          </p>
          <h2 className={styles.title}>CAREER EVOLUTION</h2>
          <p className={`${styles.subtitle} label-mono`}>EVERY SYSTEM HAS AN ORIGIN.</p>
        </header>

        <p className={styles.srOnly} role="status" aria-live="polite">
          Showing {entry.company}, {entry.position}, {formatPeriod(entry)}. Entry {index + 1} of {CAREER.length}.
        </p>

        <div className={styles.body}>
          <CareerTimeline entries={CAREER} activeIndex={index} onSelect={goToCareer} />
          <div id="career-panels" className={styles.panels}>
            {CAREER.map((e, i) => (
              <div
                key={e.id}
                data-career-panel={i}
                data-state={i === index ? "active" : "inactive"}
                className={styles.panelSlot}
                inert={i !== index}
                aria-hidden={i !== index}
              >
                <CareerInformation
                  entry={e}
                  index={i}
                  total={CAREER.length}
                  reveal={false}
                  {...nav[i]}
                />
              </div>
            ))}
          </div>
        </div>

        <CareerScrollController stageRef={stageRef} count={CAREER.length} lite={tier === "lite"} />
      </div>
      <span id="career-end" tabIndex={-1} />
    </Section>
  );
}
