import { memo } from "react";
import { SHOW_CONFIRMATION_MARKERS } from "@/lib/careerTier";
import type { CareerEntry } from "./career.types";
import { formatPeriod } from "@/data/career";
import styles from "./career.module.css";

interface Props {
  entry: CareerEntry;
  index: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  /** Play the CSS entrance on mount. Disabled when GSAP owns the reveal (scroll mode). Default true. */
  reveal?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Information panel for the focused entry (presentation only — all content comes from `CareerEntry`).
 * Only CV-stated facts are rendered. Missing fields show an explicit "awaiting confirmation" marker.
 * Re-keyed on entry id so the reveal sequence replays on change.
 */
function CareerInformation({ entry, index, total, onPrev, onNext, prevLabel, nextLabel, reveal = true }: Props) {
  const headingId = `career-title-${entry.id}`;
  const unconfirmedProjects = SHOW_CONFIRMATION_MARKERS ? entry.projects.filter((p) => !p.nameConfirmed) : [];

  return (
    <section id={`career-info-${entry.id}`} className={styles.info} aria-labelledby={headingId}>
      <span className={styles.corner} data-pos="tl" aria-hidden="true" />
      <span className={styles.corner} data-pos="br" aria-hidden="true" />

      <div key={entry.id} className={reveal ? styles.reveal : undefined}>
        <p data-ci="meta" className={`${styles.infoMeta} label-mono`} style={{ "--i": 0 } as React.CSSProperties}>
          <span>NODE {pad(index + 1)}</span>
          <span aria-hidden="true" className={styles.metaRule} />
          <span>{formatPeriod(entry)}</span>
          {entry.location && <span>· {entry.location}</span>}
        </p>

        <h3 data-ci="company" id={headingId} className={styles.infoCompany} style={{ "--i": 1 } as React.CSSProperties}>
          {entry.company}
        </h3>
        <p data-ci="title" className={styles.infoTitle} style={{ "--i": 2 } as React.CSSProperties}>
          <span className={styles.titleMark} aria-hidden="true" />
          {entry.position}
        </p>

        <hr data-ci="divider" className={styles.divider} style={{ "--i": 3 } as React.CSSProperties} />

        {entry.description ? (
          <p data-ci="text" className={styles.infoText} style={{ "--i": 3 } as React.CSSProperties}>{entry.description}</p>
        ) : null}

        {entry.responsibilities.length > 0 && (
          <div data-ci="list" style={{ "--i": 4 } as React.CSSProperties}>
            <h4 className={`${styles.infoHead} label-mono`}>Delivered</h4>
            <ul className={styles.list}>
              {entry.responsibilities.map((r, i) => (
                <li key={i} className={styles.listItem}>
                  <span className={`${styles.listIdx} label-mono`} aria-hidden="true">{pad(i + 1)}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {entry.projects.length > 0 && (
          <div data-ci="tags" style={{ "--i": 5 } as React.CSSProperties}>
            <h4 className={`${styles.infoHead} label-mono`}>Projects</h4>
            <ul className={styles.tags}>
              {entry.projects.map((p) => (
                <li key={p.id} className={styles.tag}>
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <nav data-ci="nav" className={styles.stepper} aria-label="Career entries">
        <button type="button" className={styles.stepBtn} onClick={onPrev} disabled={!onPrev} aria-label={prevLabel ? `Previous: ${prevLabel}` : "Previous entry"}>
          <span aria-hidden="true">←</span> <span className="label-mono">PREV</span>
        </button>
        <span className={`${styles.stepCount} label-mono`} aria-hidden="true">{pad(index + 1)} / {pad(total)}</span>
        <button type="button" className={styles.stepBtn} onClick={onNext} disabled={!onNext} aria-label={nextLabel ? `Next: ${nextLabel}` : "Next entry"}>
          <span className="label-mono">NEXT</span> <span aria-hidden="true">→</span>
        </button>
      </nav>
    </section>
  );
}

export default memo(CareerInformation); // props are stable (see CareerEvolution) → no re-render on unrelated selection changes
