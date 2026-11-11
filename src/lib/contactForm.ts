/** Contact form logic. Pure functions — no network. The form hands the message to the visitor's own email app (mailto:). */
export type Field = "name" | "email" | "message";
export type ContactValues = Record<Field, string>;
export type ContactErrors = Partial<Record<Field, string>>;

export const LIMITS = { name: 80, email: 120, message: 1000, minMessage: 10, mailto: 1900 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function buildSubject(v: ContactValues) {
  return `Message from ${v.name.trim()} via portfolio`;
}

export function buildBody(v: ContactValues) {
  return `${v.message.trim()}\r\n\r\n—\r\n${v.name.trim()}\r\n${v.email.trim()}`;
}

export function buildMailto(to: string, v: ContactValues) {
  return `mailto:${to}?subject=${encodeURIComponent(buildSubject(v))}&body=${encodeURIComponent(buildBody(v))}`;
}

/** Plain-text version for the clipboard fallback. */
export function buildPlainText(to: string, v: ContactValues) {
  return `To: ${to}\nSubject: ${buildSubject(v)}\n\n${buildBody(v).replace(/\r\n/g, "\n")}`;
}

export function validateField(field: Field, v: ContactValues, to: string): string | undefined {
  const value = v[field].trim();
  if (field === "name") {
    if (!value) return "Enter your name.";
    if (value.length < 2) return "Enter your full name (at least 2 characters).";
    return undefined;
  }
  if (field === "email") {
    if (!value) return "Enter your email address so a reply can reach you.";
    if (!EMAIL_RE.test(value)) return "Enter a valid email address, like name@example.com.";
    return undefined;
  }
  if (!value) return "Write a message.";
  if (value.length < LIMITS.minMessage) return `Write at least ${LIMITS.minMessage} characters.`;
  if (value.length > LIMITS.message) return `Keep the message under ${LIMITS.message} characters.`;
  if (buildMailto(to, v).length > LIMITS.mailto) return "This message is too long to open in an email app. Shorten it.";
  return undefined;
}

export function validate(v: ContactValues, to: string): ContactErrors {
  const out: ContactErrors = {};
  (["name", "email", "message"] as const).forEach((f) => {
    const e = validateField(f, v, to);
    if (e) out[f] = e;
  });
  return out;
}
