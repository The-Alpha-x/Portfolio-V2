import { memo } from "react";
import type { Project } from "./archive.types";
import { openCaseStudy } from "@/lib/archiveState";
import styles from "./archive.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** Floating info panel for one project (cinematic mode). GSAP animates the [data-ai] children; React never re-renders it on scroll. */
function ArchivePanel({ project, index, total }: { project: Project; index: number; total: number }) {
  const hid = `archive-title-${project.id}`;
  const shot = project.screenshots[0];
  const lead = project.kind === "featured" ? project.features.slice(0, 4) : project.features.slice(0, 3);
  return (
    <section className={styles.panel} data-kind={project.kind} aria-labelledby={hid}>
      <span className={styles.numeral} data-parallax aria-hidden="true">{pad(index + 1)}</span>
      <p data-ai="meta" className={`${styles.meta} label-mono`}>
        <span>{project.kind === "featured" ? "FEATURED" : "SECONDARY SHOWCASE"}</span>
        <span aria-hidden="true" className={styles.rule} />
        <span>{pad(index + 1)} / {pad(total)}</span>
      </p>
      <h3 data-ai="name" id={hid} className={styles.name}>{project.name}</h3>
      <p data-ai="tag" className={styles.tagline}>{project.tagline}</p>
      {project.partOf && <p data-ai="part" className={`${styles.part} label-mono`}>{project.partOf}</p>}

      {shot && (
        <div data-ai="shot" className={styles.shot}>
          <img src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} loading="lazy" decoding="async" />
        </div>
      )}

      {project.stack.length > 0 && (
        <div data-ai="stack">
          <h4 className={`${styles.sub} label-mono`}>Technology</h4>
          <ul className={styles.chips}>{project.stack.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      <div data-ai="feat">
        <h4 className={`${styles.sub} label-mono`}>Key features</h4>
        <ul className={styles.feat}>{lead.map((f) => <li key={f}>{f}</li>)}</ul>
      </div>
      <div data-ai="cta">
        <button type="button" className={styles.cta} onClick={() => openCaseStudy(project.id)} aria-haspopup="dialog">
          <span className="label-mono">OPEN CASE STUDY</span> <span aria-hidden="true">→</span>
          <span className={styles.srOnly}> for {project.name}</span>
        </button>
      </div>
    </section>
  );
}
export default memo(ArchivePanel);
