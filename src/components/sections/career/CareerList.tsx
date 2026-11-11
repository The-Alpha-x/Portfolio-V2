"use client";
import { useEffect, useRef, useState } from "react";
import { CAREER, formatPeriod } from "@/data/career";
import { SHOW_CONFIRMATION_MARKERS } from "@/lib/careerTier";
import styles from "./careerList.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Lightweight vertical career timeline — used on mobile (<768px), without WebGL, on low-power / data-saver devices,
 * and as the server-rendered baseline (works with JS disabled). No 3D, no pin, no ScrollTrigger.
 * The crimson active node follows the entry nearest the viewport centre (IntersectionObserver, no scroll handler).
 */
export default function CareerList() {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const els = items.current.filter(Boolean) as HTMLLIElement[];
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (rows) => {
        rows.forEach((r) => {
          if (r.isIntersecting) setActive(els.indexOf(r.target as HTMLLIElement));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" } // a 10% band at the viewport centre
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const jump = (i: number) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = items.current[i];
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el?.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  };

  return (
    <div className={styles.root} data-career-mode="list">
      <header className={styles.head}>
        <p className={`${styles.eyebrow} label-mono`}>
          <span className={styles.mark} aria-hidden="true" />
          03 / 06 — CAREER EVOLUTION
        </p>
        <h2 className={styles.title}>CAREER EVOLUTION</h2>
        <p className={`${styles.subtitle} label-mono`}>EVERY SYSTEM HAS AN ORIGIN.</p>
      </header>

      <nav className={styles.chips} aria-label="Jump to career entry">
        {CAREER.map((e, i) => (
          <button key={e.id} type="button" className={styles.chip} aria-current={i === active ? "true" : undefined} onClick={() => jump(i)}>
            <span className="label-mono">{pad(i + 1)}</span>
            <span>{e.startDate}{e.endDate ? `–${e.endDate.slice(-2)}` : "+"}</span>
          </button>
        ))}
      </nav>

      <ol className={styles.list} aria-label="Career timeline, oldest first">
        {CAREER.map((e, i) => {
          const hid = `career-list-${e.id}`;
          return (
            <li
              key={e.id}
              ref={(el) => { items.current[i] = el; }}
              className={styles.item}
              data-active={i === active || undefined}
              data-visited={i < active || undefined}
            >
              <span className={styles.node} aria-hidden="true" />
              <article aria-labelledby={hid} className={styles.card}>
                <p className={`${styles.meta} label-mono`}>
                  <span>NODE {pad(i + 1)} / {pad(CAREER.length)}</span>
                  <span>{formatPeriod(e)}</span>
                  {e.location && <span>{e.location}</span>}
                  {i === active && <span className={styles.now}>— ACTIVE</span>}
                </p>
                <h3 id={hid} tabIndex={-1} className={styles.company}>{e.company}</h3>
                <p className={styles.position}>{e.position}</p>

                {e.description ? (
                  <p className={styles.text}>{e.description}</p>
                ) : SHOW_CONFIRMATION_MARKERS ? (
                  <p className={`${styles.pending} label-mono`}>ROLE SUMMARY — AWAITING CONFIRMATION</p>
                ) : null}

                {(e.responsibilities.length > 0 || e.projects.length > 0) && (
                  /* Native disclosure: works without JS, keyboard + screen-reader friendly, 48px touch target. Summary stays visible when collapsed. */
                  <details className={styles.more}>
                    <summary className={styles.moreSum}>
                      <span className="label-mono">
                        {e.responsibilities.length > 0 && `${e.responsibilities.length} delivered`}
                        {e.responsibilities.length > 0 && e.projects.length > 0 && " · "}
                        {e.projects.length > 0 && `${e.projects.length} ${e.projects.length === 1 ? "project" : "projects"}`}
                      </span>
                      <span className={styles.moreIcon} aria-hidden="true" />
                      <span className="sr-only"> — show details for {e.company}</span>
                    </summary>

                    {e.responsibilities.length > 0 && (
                      <>
                        <h4 className={`${styles.sub} label-mono`}>Delivered</h4>
                        <ul className={styles.bullets}>
                          {e.responsibilities.map((r, k) => <li key={k}>{r}</li>)}
                        </ul>
                      </>
                    )}

                    {e.projects.length > 0 && (
                      <>
                        <h4 className={`${styles.sub} label-mono`}>Projects</h4>
                        <ul className={styles.tags}>
                          {e.projects.map((p) => (
                            <li key={p.id} className={styles.tag}>
                              {p.name}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </details>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
