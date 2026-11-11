"use client";
import Image from "next/image";
import { PROJECTS } from "@/data/projects";
import { openCaseStudy } from "@/lib/archiveState";
import styles from "./archiveList.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Simple project list: mobile (<768px), no-WebGL / low-power fallback, and the server-rendered baseline.
 * No 3D, no pin, no ScrollTrigger. Screenshots go through next/image (lazy, responsive sizes). Carries all project information.
 */
export default function ArchiveList() {
  return (
    <div className={styles.root} data-archive-mode="list">
      <header className={styles.head}>
        <p className={`${styles.eyebrow} label-mono`}><span className={styles.mark} aria-hidden="true" />04 / 06 — ENGINEERING ARCHIVE</p>
        <h2 className={styles.title}>ENGINEERING ARCHIVE</h2>
        <p className={`${styles.subtitle} label-mono`}>IDEAS TURNED INTO DIGITAL REALITY.</p>
      </header>
      <ol className={styles.list} aria-label="Projects">
        {PROJECTS.map((p, i) => {
          const hid = `archive-list-${p.id}`;
          const shot = p.screenshots[0];
          return (
            <li key={p.id} className={styles.item} data-kind={p.kind}>
              <article aria-labelledby={hid} className={styles.card}>
                {shot && (
                  // next/image: AVIF/WebP at phone-sized widths, lazy, intrinsic ratio reserved (no layout shift). Below-the-fold → never priority.
                  <Image className={styles.img} src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(max-width: 639px) calc(100vw - 3rem), (max-width: 1023px) 50vw, 480px" loading="lazy" />
                )}
                <p className={`${styles.meta} label-mono`}>
                  <span>{pad(i + 1)}</span><span>{p.kind === "featured" ? "FEATURED" : "SECONDARY"}</span><span>{p.period}</span>
                </p>
                <h3 id={hid} className={styles.name}>{p.name}</h3>
                <p className={styles.tagline}>{p.tagline}</p>
                {p.partOf && <p className={`${styles.part} label-mono`}>{p.partOf}</p>}
                {p.stack.length > 0 && <ul className={styles.chips} aria-label={`${p.name} technology`}>{p.stack.map((t) => <li key={t}>{t}</li>)}</ul>}
                {p.kind === "featured" && <ul className={styles.feat}>{p.features.slice(0, 4).map((f) => <li key={f}>{f}</li>)}</ul>}
                <button type="button" className={styles.cta} onClick={() => openCaseStudy(p.id)} aria-haspopup="dialog">
                  <span className="label-mono">CASE STUDY</span> <span aria-hidden="true">→</span>
                  <span className={styles.sr}> for {p.name}</span>
                </button>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
