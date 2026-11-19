import "server-only";
import type { Lead } from "@/lib/lead";

const TIMEOUT_MS = 5000;

// Defuse anything Discord would treat as a ping or a link-styled mention,
// even though allowed_mentions already blocks the notification.
function defuse(text: string): string {
  return text
    .replace(/@(everyone|here)/gi, "@​$1")
    .replace(/<(@[!&]?|#)(\d+)>/g, "<$1​$2>");
}

function field(name: string, value: string, inline = false) {
  return { name, value: defuse(value).slice(0, 1024) || "—", inline };
}

export async function sendLeadToDiscord(lead: Lead, webhookUrl: string): Promise<boolean> {
  const payload = {
    username: "Portfolio leads",
    allowed_mentions: { parse: [] as string[] },
    embeds: [
      {
        title: "New project enquiry",
        description: defuse(lead.message).slice(0, 4096),
        color: 0xff5a1f,
        fields: [field("Name", lead.name, true), field("Email", lead.email, true), field("Service", lead.service, true)],
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store"
    });
    if (!response.ok) console.error(`[contact] Discord webhook responded ${response.status}`);
    return response.ok;
  } catch (error) {
    console.error("[contact] Discord webhook failed:", error instanceof Error ? error.name : "unknown");
    return false;
  }
}

export async function verifyTurnstile(token: string | undefined, secret: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip !== "unknown") body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store"
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
