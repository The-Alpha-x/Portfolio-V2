"use client";
import { useRef, type KeyboardEvent } from "react";
import type { CareerEntry } from "./career.types";
import CareerNode from "./CareerNode";
import styles from "./career.module.css";

interface Props {
  entries: CareerEntry[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** Ordered node selector (oldest → newest). Arrow keys / Home / End move selection and focus. */
export default function CareerTimeline({ entries, activeIndex, onSelect }: Props) {
  const ref = useRef<HTMLOListElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    const last = entries.length - 1;
    let to = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") to = Math.min(last, activeIndex + 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") to = Math.max(0, activeIndex - 1);
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = last;
    if (to < 0) return;
    e.preventDefault();
    onSelect(to);
    ref.current?.querySelectorAll<HTMLButtonElement>("button")[to]?.focus();
  };

  return (
    <ol ref={ref} data-career-spine className={styles.timeline} aria-label="Career timeline, oldest first" onKeyDown={onKeyDown}>
      {entries.map((entry, i) => (
        <CareerNode key={entry.id} entry={entry} index={i} total={entries.length} active={i === activeIndex} onSelect={() => onSelect(i)} />
      ))}
    </ol>
  );
}
