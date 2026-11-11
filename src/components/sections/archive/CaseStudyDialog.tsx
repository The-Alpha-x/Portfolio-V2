"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { PROJECTS } from "@/data/projects";
import { closeCaseStudy, useCaseStudy } from "@/lib/archiveState";
import { SHOW_CONFIRMATION_MARKERS } from "@/lib/careerTier";
import { useLenis } from "@/providers/SmoothScrollProvider";
import styles from "./caseStudy.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Case-study modal — native <dialog> (top layer, focus trap, Esc, focus return). Content mounts only while open, so
 * screenshots load lazily and only on demand. Sections without real data are hidden in production (never invented).
 */
export default function CaseStudyDialog() {
  const id = useCaseStudy();
  const idx = PROJECTS.findIndex((p) => p.id === id);
  const project = idx >= 0 ? PROJECTS[idx] : null;
  const ref = useRef<HTMLDialogElement>(null);
  const lenis = useLenis();

  useEffect(() => {
    const d = ref.current;
    if (!d || !project) return;
    if (!d.open) d.showModal();
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
      lenis?.start();
      if (d.open) d.close();
    };
  }, [project, lenis]);

  const M = SHOW_CONFIRMATION_MARKERS;
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="case-title"
      onClose={closeCaseStudy}
      onClick={(e) => { if (e.target === e.currentTarget) closeCaseStudy(); }}
    >
      {project && (
        <div className={styles.sheet} data-lenis-prevent>
          <button type="button" className={styles.close} onClick={closeCaseStudy} autoFocus>
            <span className="label-mono">CLOSE</span> <span aria-hidden="true">✕</span>
          </button>
          <p className={`${styles.eyebrow} label-mono`}>
            CASE STUDY {pad(idx + 1)} / {pad(PROJECTS.length)} — {project.kind === "featured" ? "FEATURED" : "SECONDARY"}
          </p>
          <h2 id="case-title" className={styles.title}>{project.name}</h2>
          <p className={`${styles.role} label-mono`}>{project.position} · {project.company} · {project.period}</p>
          {project.partOf && <p className={`${styles.part} label-mono`}>{project.partOf}</p>}

          {(project.links.live || project.links.github) && (
            <p className={styles.links}>
              {project.links.live && <a href={project.links.live} target="_blank" rel="noopener noreferrer">Live demo ↗<span className={styles.sr}> (opens in a new tab)</span></a>}
              {project.links.github && <a href={project.links.github} target="_blank" rel="noopener noreferrer">GitHub ↗<span className={styles.sr}> (opens in a new tab)</span></a>}
            </p>
          )}

          <section aria-labelledby="cs-overview"><h3 id="cs-overview" className="label-mono">Project overview</h3><p>{project.tagline} {project.summary}</p></section>

          {project.problem ? (
            <section aria-labelledby="cs-problem"><h3 id="cs-problem" className="label-mono">Problem being solved</h3><p>{project.problem}</p></section>
          ) : null}

          <section aria-labelledby="cs-contrib">
            <h3 id="cs-contrib" className="label-mono">My contribution</h3>
            <p>{project.verb} {project.name} as {project.position} at {project.company} ({project.period}).</p>
          </section>

          {project.features.length > 0 && (
            <section aria-labelledby="cs-feat"><h3 id="cs-feat" className="label-mono">Main features</h3><ul>{project.features.map((f) => <li key={f}>{f}</li>)}</ul></section>
          )}
          {project.technical.length > 0 && (
            <section aria-labelledby="cs-tech"><h3 id="cs-tech" className="label-mono">Technical implementation</h3><ul>{project.technical.map((f) => <li key={f}>{f}</li>)}</ul></section>
          )}
          {project.stack.length > 0 ? (
            <section aria-labelledby="cs-stack"><h3 id="cs-stack" className="label-mono">Technology stack</h3><ul className={styles.chips}>{project.stack.map((t) => <li key={t}>{t}</li>)}</ul></section>
          ) : M && <p className={`${styles.pending} label-mono`}>TECHNOLOGY STACK — NOT CONFIRMED FOR THIS PROJECT</p>}

          {project.screenshots.length > 0 ? (
            <section aria-labelledby="cs-shots">
              <h3 id="cs-shots" className="label-mono">Screenshots</h3>
              <div className={styles.shots}>
                {project.screenshots.map((s) => (
                  <figure key={s.src}>
                    <Image src={s.src} alt={s.alt} width={s.width} height={s.height} sizes="(max-width: 900px) 100vw, 860px" loading="lazy" />
                    {s.caption && <figcaption className="label-mono">{s.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          ) : M && <p className={`${styles.pending} label-mono`}>SCREENSHOTS — ADD REAL IMAGES IN src/data/projects.ts</p>}
        </div>
      )}
    </dialog>
  );
}
