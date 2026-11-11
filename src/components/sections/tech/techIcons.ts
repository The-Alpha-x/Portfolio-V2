import type { ComponentType } from "react";
import {
  SiTypescript, SiJavascript, SiPhp, SiReact, SiNextdotjs, SiTailwindcss, SiShadcnui, SiPrimereact,
  SiNodedotjs, SiLaravel, SiMysql, SiFirebase, SiGit,
} from "react-icons/si";
import { FaHtml5, FaCss3Alt, FaSlack } from "react-icons/fa";
import { Webhook, CreditCard, Blocks, Cpu } from "lucide-react";

/** Imported as a type by sections/connect/ConnectSection — keep this export. */
export type LogoComponent = ComponentType<{ size?: number | string; color?: string; xmlns?: string; "aria-hidden"?: boolean }>;

/**
 * Authentic brand logos: Simple Icons where the brand is published there, Font Awesome brands otherwise (Slack — Simple Icons
 * removed it; HTML5 / CSS3 — the official shield marks). The three integration nodes are concepts, not products, so they use
 * neutral glyphs rather than a made-up "logo".
 */
export const TECH_ICONS: Record<string, LogoComponent> = {
  react: SiReact, nextjs: SiNextdotjs, reactnative: SiReact, typescript: SiTypescript, javascript: SiJavascript,
  html: FaHtml5, css: FaCss3Alt, tailwind: SiTailwindcss, primereact: SiPrimereact,
  laravel: SiLaravel, php: SiPhp, nodejs: SiNodedotjs,
  firebase: SiFirebase, mysql: SiMysql,
  git: SiGit, slack: FaSlack, shadcn: SiShadcnui,
  api: Webhook, payments: CreditCard, thirdparty: Blocks,
};

/** Always returns a renderable component; warns in dev if a registry key is missing so it can be fixed. */
export function getLogo(key: string): LogoComponent {
  const Icon = TECH_ICONS[key] as LogoComponent | undefined;
  if (Icon) return Icon;
  if (process.env.NODE_ENV !== "production") console.warn(`[tech] no logo registered for "${key}" — using fallback.`);
  return Cpu;
}
