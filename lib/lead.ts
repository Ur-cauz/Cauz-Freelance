import { site } from "@/lib/content";

export const LEAD_LIMITS = {
  bodyBytes: 8 * 1024,
  name: 100,
  email: 254,
  messageMin: 10,
  messageMax: 4000,
  /** Humans need a few seconds to fill the form; bots post instantly. */
  minFillMs: 3000,
  /** A form left open longer than this is stale; ask for a reload. */
  maxFillMs: 24 * 60 * 60 * 1000
} as const;

export type Lead = { name: string; email: string; service: string; message: string };

export type LeadCheck =
  | { kind: "ok"; lead: Lead; turnstileToken?: string }
  | { kind: "spam" }
  | { kind: "invalid" };

// Pragmatic RFC 5322 subset: local@domain.tld, no spaces or angle brackets.
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
// Strip control chars except tab/newline.
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

const ALLOWED_KEYS = new Set(["name", "email", "service", "message", "website", "startedAt", "turnstileToken"]);

function clean(value: unknown): string | null {
  return typeof value === "string" ? value.replace(CONTROL, "").trim() : null;
}

export function checkLead(body: unknown, now = Date.now()): LeadCheck {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { kind: "invalid" };
  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => !ALLOWED_KEYS.has(key))) return { kind: "invalid" };

  // Honeypot: a hidden field humans never see. Pretend success.
  if (typeof input.website === "string" && input.website.length > 0) return { kind: "spam" };

  // Minimum fill time: startedAt is set when the form mounts.
  const startedAt = input.startedAt;
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return { kind: "invalid" };
  const elapsed = now - startedAt;
  if (elapsed < LEAD_LIMITS.minFillMs) return { kind: "spam" };
  if (elapsed > LEAD_LIMITS.maxFillMs) return { kind: "invalid" };

  const name = clean(input.name);
  const email = clean(input.email);
  const service = clean(input.service);
  const message = clean(input.message);

  if (!name || name.length > LEAD_LIMITS.name) return { kind: "invalid" };
  if (!email || email.length > LEAD_LIMITS.email || !EMAIL.test(email)) return { kind: "invalid" };
  if (!service || !site.contactServices.includes(service)) return { kind: "invalid" };
  if (!message || message.length < LEAD_LIMITS.messageMin || message.length > LEAD_LIMITS.messageMax) return { kind: "invalid" };

  const token = input.turnstileToken;
  if (token !== undefined && (typeof token !== "string" || token.length > 2048)) return { kind: "invalid" };

  return { kind: "ok", lead: { name, email, service, message }, turnstileToken: token };
}
