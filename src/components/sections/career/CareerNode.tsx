import type { CareerEntry } from "./career.types";
import { formatPeriod } from "@/data/career";
import styles from "./career.module.css";

interface Props {
  entry: CareerEntry;
  index: number;
  total: number;
  active: boolean;
  onSelect: () => void;
}

/** One stop on the timeline — a real button. Active state is shown by shape + text ("ACTIVE"), not colour alone. */
export default function CareerNode({ entry, index, total, active, onSelect }: Props) {
  return (
    <li className={styles.node} data-career-node={entry.id} data-active={active || undefined}>
      <button
        type="button"
        className={styles.nodeBtn}
        aria-pressed={active}
        aria-current={active ? "step" : undefined}
        aria-controls="career-panels"
        aria-label={`${entry.company}, ${entry.position}, ${formatPeriod(entry)}. Entry ${index + 1} of ${total}.`}
        onClick={onSelect}
      >
        <span className={styles.marker} aria-hidden="true" />
        <span className={`${styles.period} label-mono`} aria-hidden="true">
          <i>{String(index + 1).padStart(2, "0")}</i> {formatPeriod(entry)}
          {active && <b className={styles.activeTag}>— ACTIVE</b>}
        </span>
        <span className={styles.company} aria-hidden="true">{entry.company}</span>
        <span className={styles.position} aria-hidden="true">{entry.position}</span>
      </button>
    </li>
  );
}
