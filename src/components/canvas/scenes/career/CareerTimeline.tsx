"use client";
import { useMemo } from "react";
import { Float } from "@react-three/drei";
import { CAREER } from "@/data/career";
import CareerNode from "./CareerNode";
import TimelineConnection from "./TimelineConnection";
import type { CareerMaterials } from "./careerMaterials";
import { TIMELINE, nodeX } from "./careerConfig";
import { careerState } from "@/lib/careerState";
import type { CareerQuality } from "@/lib/careerTier";

/** Floating horizontal timeline: one node per career entry (oldest → newest, left → right) joined by lit rails. */
export default function CareerTimeline({ mats, q }: { mats: CareerMaterials; q: CareerQuality }) {
  const count = CAREER.length;
  const xs = useMemo(() => CAREER.map((_, i) => nodeX(i, count)), [count]);
  const gap = TIMELINE.nodeRadius + 0.2;

  return (
    <Float speed={q.float && !careerState.reduced ? 0.8 : 0} rotationIntensity={0} floatIntensity={q.float ? 0.25 : 0} floatingRange={[-0.08, 0.08]}>
      <group name="career-timeline" position={[0, TIMELINE.y, 0]}>
        {CAREER.map((e, i) => (
          <CareerNode key={e.id} index={i} position={[xs[i], 0, 0]} mats={mats} q={q} />
        ))}
        {xs.slice(0, -1).map((x, i) => (
          <TimelineConnection key={i} from={x + gap} to={xs[i + 1] - gap} mats={mats} link={i} q={q} />
        ))}
        {/* open ends: the line continues past the first and last node */}
        <TimelineConnection from={xs[0] - gap - 3} to={xs[0] - gap} mats={mats} />
        <TimelineConnection from={xs[count - 1] + gap} to={xs[count - 1] + gap + 3} mats={mats} />
      </group>
    </Float>
  );
}
