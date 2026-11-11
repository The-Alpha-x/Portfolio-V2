"use client";
import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Copy, Mail, RotateCw } from "lucide-react";
import { CONTACT } from "@/data/contact";
import { LIMITS, buildMailto, buildPlainText, validate, validateField, type ContactErrors, type ContactValues, type Field } from "@/lib/contactForm";
import styles from "./connect.module.css";

type CopyState = "idle" | "copied" | "failed";
const FIELDS: Field[] = ["name", "email", "message"];

/**
 * Validated contact form with NO backend. A valid submit opens the visitor's own email app with the message pre-filled
 * (mailto:), and says so — nothing is sent from this page. Copy-to-clipboard is the fallback for devices without a mail client.
 */
export default function ContactForm() {
  const uid = useId();
  const [values, setValues] = useState<ContactValues>({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [summary, setSummary] = useState("");
  const [opened, setOpened] = useState(false);
  const [copy, setCopy] = useState<CopyState>("idle");
  const refs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  const idOf = (f: Field) => `${uid}-${f}`;
  const describe = (f: Field) => [errors[f] ? `${idOf(f)}-err` : "", f === "message" ? `${idOf(f)}-count` : ""].filter(Boolean).join(" ") || undefined;

  const onChange = (f: Field) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [f]: e.target.value };
    setValues(next);
    if (opened) { setOpened(false); setCopy("idle"); } // editing after sending → back to a normal form
    if (errors[f]) setErrors((p) => ({ ...p, [f]: validateField(f, next, CONTACT.email) })); // fix is acknowledged as you type
  };
  const onBlur = (f: Field) => () => {
    if (!values[f]) return; // don't scold an untouched empty field when tabbing through
    setErrors((p) => ({ ...p, [f]: validateField(f, values, CONTACT.email) }));
  };

  const openDraft = () => { window.location.href = buildMailto(CONTACT.email, values); };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validate(values, CONTACT.email);
    setErrors(errs);
    const bad = FIELDS.filter((f) => errs[f]);
    if (bad.length) {
      setSummary(`Fix ${bad.length} ${bad.length === 1 ? "field" : "fields"} before opening the email draft.`);
      setOpened(false);
      refs.current[bad[0]]?.focus();
      return;
    }
    setSummary("");
    setCopy("idle");
    setOpened(true);
    openDraft();
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText(CONTACT.email, values));
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  const field = (f: Field, label: string, props: { type?: string; autoComplete?: string; inputMode?: "email" | "text"; max: number }) => {
    const common = {
      id: idOf(f), name: f, value: values[f], onChange: onChange(f), onBlur: onBlur(f), maxLength: props.max,
      "aria-invalid": errors[f] ? (true as const) : undefined, "aria-describedby": describe(f), "aria-required": true as const,
      className: styles.input,
    };
    return (
      <div className={styles.field}>
        <label htmlFor={idOf(f)} className={`${styles.fieldLabel} label-mono`}>{label}</label>
        {f === "message" ? (
          <textarea {...common} ref={(el) => { refs.current[f] = el; }} rows={5} />
        ) : (
          <input {...common} ref={(el) => { refs.current[f] = el; }} type={props.type} autoComplete={props.autoComplete} inputMode={props.inputMode} />
        )}
        {f === "message" && <span id={`${idOf(f)}-count`} className={`${styles.count} label-mono`}>{values.message.length} / {LIMITS.message}</span>}
        {errors[f] && <p id={`${idOf(f)}-err`} className={styles.error}>{errors[f]}</p>}
      </div>
    );
  };

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate aria-describedby={`${uid}-summary`}>
      <p id={`${uid}-summary`} role="alert" className={styles.summary}>{summary}</p>

      {field("name", "Your name", { autoComplete: "name", max: LIMITS.name })}
      {field("email", "Your email", { type: "email", autoComplete: "email", inputMode: "email", max: LIMITS.email })}
      {field("message", "Message", { max: LIMITS.message })}

      <button type="submit" className={styles.submit}>
        <Mail size={16} aria-hidden="true" /> Open in my email app
      </button>

      <div role="status" aria-live="polite" className={styles.statusRegion}>
        {opened && (
          <div className={styles.status}>
            <p className={styles.statusTitle}>Email draft opened.</p>
            <p className={styles.statusText}>
              Your email app should now show the message, addressed to {CONTACT.email}. Nothing has been sent yet — press send there.
              If nothing opened, copy the message and send it to that address.
            </p>
            <div className={styles.statusActions}>
              <button type="button" onClick={openDraft}><RotateCw size={14} aria-hidden="true" /> Open again</button>
              <button type="button" onClick={onCopy}><Copy size={14} aria-hidden="true" /> Copy message</button>
            </div>
            {copy === "copied" && <p className={styles.statusText}>Message copied.</p>}
            {copy === "failed" && <p className={styles.statusText}>Could not copy automatically. Select the message text and copy it, or write to {CONTACT.email} directly.</p>}
          </div>
        )}
      </div>
    </form>
  );
}
