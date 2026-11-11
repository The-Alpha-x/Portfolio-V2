"use client";
import { useRef, type MouseEvent } from "react";
import { ArrowUpRight, Download, Mail, PenLine, Phone } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import Section from "@/components/layout/Section";
import { CONTACT, isHttps, prettyUrl } from "@/data/contact";
import { SHOW_CONFIRMATION_MARKERS, useCareerTier } from "@/lib/careerTier";
import { useAnchorScroll } from "@/hooks/useAnchorScroll";
import ConnectScrollController from "./ConnectScrollController";
import ConnectListMotion from "./ConnectListMotion";
import ContactForm from "./ContactForm";
import type { LogoComponent } from "../tech/techIcons";
import styles from "./connect.module.css";

const HEADLINE = ["THE MACHINE IS BUILT.", "LET’S CREATE SOMETHING."] as const;
const PORTRAIT_FALLBACK = "/images/hero/final-portrait-720p.webp";

interface Channel { key: string; label: string; href: string; value: string; external: boolean; icon: "mail" | "linkedin" | "github" | "phone" }

/** Only channels with real data are built; missing URLs are never invented. */
function channels(): { list: Channel[]; missing: string[] } {
  const list: Channel[] = [{ key: "email", label: "Email", href: `mailto:${CONTACT.email}`, value: CONTACT.email, external: false, icon: "mail" }];
  const missing: string[] = [];
  if (isHttps(CONTACT.linkedin)) list.push({ key: "linkedin", label: "LinkedIn", href: CONTACT.linkedin, value: prettyUrl(CONTACT.linkedin), external: true, icon: "linkedin" });
  else missing.push("LinkedIn");
  if (isHttps(CONTACT.github)) list.push({ key: "github", label: "GitHub", href: CONTACT.github, value: prettyUrl(CONTACT.github), external: true, icon: "github" });
  else missing.push("GitHub");
  if (CONTACT.phone.show) list.push({ key: "phone", label: "Phone", href: `tel:${CONTACT.phone.tel}`, value: CONTACT.phone.display, external: false, icon: "phone" });
  return { list, missing };
}

const ICONS: Record<Channel["icon"], LogoComponent> = { mail: Mail, phone: Phone, linkedin: FaLinkedinIn, github: FaGithub };

/**
 * Scene 06 — ESTABLISH CONNECTION. The last scene.
 *  3D tiers (full / lite): one pinned, scrubbed stage — machinery powers down, environment fades to black, the portrait returns,
 *  then the copy and contact channels appear. The form follows in normal flow while the portrait stays in the canvas.
 *  "list" tier (mobile / no WebGL / low power / SSR): the same content as a static column with the portrait as an image.
 */
export default function ConnectSection() {
  const tier = useCareerTier();
  const list = tier === "list";
  const stageRef = useRef<HTMLDivElement>(null);
  const go = useAnchorScroll();
  const { list: chans, missing } = channels();

  const toForm = (e: MouseEvent<HTMLAnchorElement>) => {
    go(e, "#connect-form");
    document.getElementById("connect-form-title")?.focus({ preventScroll: true });
  };

  return (
    <Section id="scene-06" index={5} label="Establish connection" bare className={styles.root}>
      <div ref={stageRef} className={styles.stage} data-tier={tier}>
        <div className={styles.shade} aria-hidden="true" />

        {list && (
          <div className={styles.portrait} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PORTRAIT_FALLBACK} alt="" width={720} height={960} loading="lazy" decoding="async" />
          </div>
        )}

        <h2 data-c-title className={`${styles.title} label-mono`}>
          <span className={styles.mark} aria-hidden="true" />
          <span aria-hidden="true">06 / 06 — </span>ESTABLISH CONNECTION
        </h2>

        <div className={styles.copy}>
          <p data-c-headline className={styles.headline}>
            <span className={styles.srOnly}>{HEADLINE.join(" ")}</span>
            <span aria-hidden="true">
              {HEADLINE.map((line) => (
                <span key={line} className={styles.line}>
                  {line.split(" ").map((word, wi) => (
                    <span key={wi}>
                      {wi > 0 && " "}
                      <span className={styles.word}>
                        {[...word].map((ch, ci) => (
                          <span key={ci} className={styles.mask}><span data-char className={styles.char}>{ch}</span></span>
                        ))}
                      </span>
                    </span>
                  ))}
                </span>
              ))}
            </span>
          </p>

          <ul className={styles.channels} aria-label="Contact details">
            {chans.map((c, i) => {
              const Icon = ICONS[c.icon];
              return (
                <li key={c.key} data-c-item className={i === 0 ? styles.primaryRow : undefined}>
                  <a className={styles.channel} href={c.href} {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    <span className={`${styles.chLabel} label-mono`}><Icon size={14} aria-hidden /> {c.label}</span>
                    <span className={styles.chValue}>{c.value}{c.external && <span className={styles.srOnly}> (opens in a new tab)</span>}</span>
                    <ArrowUpRight className={styles.chArrow} size={16} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
            {/* Dev-only reminder (same pattern as the other scenes' content markers); production simply omits the channel. */}
            {SHOW_CONFIRMATION_MARKERS && missing.map((m) => (
              <li key={m} data-c-item className={styles.todo}>
                <span className="label-mono">{m} — add the profile URL in src/data/contact.ts (hidden in production until set)</span>
              </li>
            ))}
          </ul>

          <div data-c-actions className={styles.actions}>
            <span className={styles.ctaWrap}>
              <a href="#connect-form" className={styles.cta} onClick={toForm}>
                <PenLine size={16} aria-hidden="true" /> WRITE A MESSAGE
              </a>
            </span>
            <a href={CONTACT.cv.href} download={CONTACT.cv.filename} className={styles.cv}>
              <Download size={16} aria-hidden="true" /> DOWNLOAD CV
            </a>
          </div>
        </div>
      </div>

      <div id="connect-form" className={styles.dock}>
        <div className={styles.formWrap}>
          <h3 id="connect-form-title" tabIndex={-1} data-reveal className={styles.formTitle}>Write a message</h3>
          <p data-reveal className={styles.formNote}>Opens your email app with the message filled in. Nothing is sent until you press send there.</p>
          <div data-reveal><ContactForm /></div>
        </div>
      </div>

      {list ? <ConnectListMotion stageRef={stageRef} /> : <ConnectScrollController stageRef={stageRef} lite={tier === "lite"} />}
    </Section>
  );
}
