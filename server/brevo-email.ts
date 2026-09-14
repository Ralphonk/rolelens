import { isIP } from "node:net";
import { resetEmailTemplate } from "./reset-email-template.js";

export function extractBlockedIp(message: string) {
  // Accept only a validated address immediately following an IP label.
  const match = message.match(/\bip(?:\s+address)?[\s:=]+["'\[]?([a-f0-9:.]+)/i);
  if (!match) return undefined;
  const candidate = match[1].replace(/\.$/, "");
  return isIP(candidate) ? candidate : undefined;
}

export class EmailDeliveryError extends Error {
  constructor(public readonly status: number, public readonly category: string, public readonly blockedIp?: string) {
    super(`Email provider rejected request (${status}): ${category}`);
  }
}

// Never return raw provider text. IP diagnostics are local-development only.
export function deliveryDiagnostic(error: unknown) {
  if (error instanceof EmailDeliveryError) return { status: error.status, category: error.category,
    ...(process.env.NODE_ENV !== "production" && error.blockedIp ? { blockedIp: error.blockedIp } : {}) };
  const name = error instanceof Error ? error.name : "";
  return { category: name === "TimeoutError" || name === "AbortError" ? "timeout" : "transport_or_unknown_error" };
}

export async function sendBrevoCode(email: string, code: string) {
  const key = process.env.BREVO_API_KEY?.trim();
  const sender = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!key || !sender) throw new Error("Brevo is not configured.");
  const template = resetEmailTemplate(code);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      sender: { name: "rolelens.", email: sender },
      to: [{ email }],
      subject: template.subject,
      textContent: template.text,
      htmlContent: template.html,
    }),
  });
  // Never log provider response bodies: they may contain recipient information.
  if (!response.ok) {
    let message = "";
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "message" in body && typeof body.message === "string") message = body.message.toLowerCase();
    } catch { /* Non-JSON responses still report their HTTP status. */ }
    const category = /ip/.test(message) && /unrecogn|unauthor|block|allowlist|whitelist/.test(message) ? "ip_not_authorized"
      : /sender/.test(message) && /verif|valid|author|register/.test(message) ? "sender_not_verified_or_allowed"
      : /activat|suspend|account.*block/.test(message) ? "account_activation_or_restriction"
      : response.status === 429 || /quota|credit/.test(message) ? "quota_or_rate_limit"
      : response.status === 401 ? "api_authentication_failed"
      : response.status === 403 ? "permission_denied"
      : response.status >= 500 ? "provider_unavailable"
      : "provider_rejected_request";
    throw new EmailDeliveryError(response.status, category, category === "ip_not_authorized" ? extractBlockedIp(message) : undefined);
  }
}
