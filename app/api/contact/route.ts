import { NextResponse, type NextRequest } from "next/server";
import { sendLeadToDiscord, verifyTurnstile } from "@/lib/discord";
import { checkLead, LEAD_LIMITS } from "@/lib/lead";
import { rateLimit } from "@/lib/rate-limit";

// Only POST is exported, so Next answers every other method with 405.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function reply(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function clientIp(request: NextRequest): string {
  // On Vercel, x-forwarded-for is set by the edge; the first entry is the client.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Reads the body, refusing anything over `limit` bytes without buffering it all. */
async function readCapped(request: NextRequest, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > limit) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(request: NextRequest) {
  // Same-origin only: browsers always send Origin on cross-site POSTs.
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) return reply(403, { error: "Forbidden." });
    } catch {
      return reply(403, { error: "Forbidden." });
    }
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply(415, { error: "Unsupported content type." });
  }

  const ip = clientIp(request);
  const limit = rateLimit(ip);
  if (!limit.ok) {
    return reply(429, { error: "Too many messages. Please try again later." }, { "Retry-After": String(limit.retryAfterS) });
  }

  const raw = await readCapped(request, LEAD_LIMITS.bodyBytes);
  if (raw === null) return reply(413, { error: "Message is too long." });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply(400, { error: "Please check the form and try again." });
  }

  const check = checkLead(body);
  if (check.kind === "invalid") return reply(400, { error: "Please check the form and try again." });
  // Honeypot or too-fast submit: look successful, deliver nothing.
  if (check.kind === "spam") return reply(200, { ok: true });

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret && !(await verifyTurnstile(check.turnstileToken, turnstileSecret, ip))) {
    return reply(400, { error: "Verification failed. Please try again." });
  }

  const webhookUrl = process.env.DISCORD_LEADS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("[contact] DISCORD_LEADS_WEBHOOK_URL is not set");
    return reply(503, { error: "The form is unavailable right now. Please email instead." });
  }

  const sent = await sendLeadToDiscord(check.lead, webhookUrl);
  if (!sent) return reply(502, { error: "Could not send right now. Please try again or email instead." });

  return reply(200, { ok: true });
}
