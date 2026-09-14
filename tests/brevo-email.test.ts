import { afterEach, expect, it, vi } from "vitest";
import { deliveryDiagnostic, sendBrevoCode, extractBlockedIp, EmailDeliveryError } from "../server/brevo-email.js";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("sends OTP through HTTPS with a verified sender", async () => {
  vi.stubEnv("BREVO_API_KEY", "test-key"); vi.stubEnv("BREVO_SENDER_EMAIL", "sender@example.com");
  const request = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", request);
  await sendBrevoCode("recipient@example.com", "123456");
  expect(request.mock.calls[0][0]).toBe("https://api.brevo.com/v3/smtp/email");
  const body = JSON.parse(request.mock.calls[0][1].body);
  expect(body.sender.email).toBe("sender@example.com");
  expect(body.textContent).toContain("123456");
  expect(body.htmlContent).toContain("123456");
  expect(body.htmlContent).toContain("Reset your password");
  expect(body.sender.name).toBe("rolelens.");
});
it("rejects provider failure without exposing provider body", async () => {
  vi.stubEnv("BREVO_API_KEY", "test-key"); vi.stubEnv("BREVO_SENDER_EMAIL", "sender@example.com");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
  await expect(sendBrevoCode("recipient@example.com", "123456")).rejects.toThrow("401");
});
it("reports only safe categories for IP restrictions", async () => {
  vi.stubEnv("BREVO_API_KEY", "secret-key"); vi.stubEnv("BREVO_SENDER_EMAIL", "private@example.com");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: "Unrecognized IP 203.0.113.10 private@example.com secret-key 123456" }) }));
  try { await sendBrevoCode("private@example.com", "123456"); throw new Error("Expected rejection"); }
  catch (error) { expect(deliveryDiagnostic(error)).toEqual({ status: 401, category: "ip_not_authorized", blockedIp: "203.0.113.10" }); expect(String(error)).not.toMatch(/private@|secret-key|123456|203\.0/); }
});
it("validates IPs and omits them from production logs", () => {
  expect(extractBlockedIp("Unrecognized IP address: 2001:db8::1")).toBe("2001:db8::1");
  expect(extractBlockedIp("IP 999.999.999.999")).toBeUndefined();
  expect(extractBlockedIp("API key secret-key")).toBeUndefined();
  vi.stubEnv("NODE_ENV", "production");
  expect(deliveryDiagnostic(new EmailDeliveryError(401, "ip_not_authorized", "203.0.113.10"))).toEqual({ status: 401, category: "ip_not_authorized" });
});
it("does not expose unknown transport error messages", () => {
  expect(deliveryDiagnostic(new Error("credentials secret-key"))).toEqual({ category: "transport_or_unknown_error" });
});
