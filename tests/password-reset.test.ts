import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), userFind: vi.fn(), userUpdate: vi.fn(), sessionDelete: vi.fn(), compare: vi.fn(), hash: vi.fn(), send: vi.fn(), claim: vi.fn() }));
vi.mock("../server/auth.js", () => ({ secret: () => "test-secret-not-for-production-12345", clearSession: vi.fn() }));
vi.mock("bcryptjs", () => ({ default: { compare: mocks.compare, hash: mocks.hash } }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: mocks.send, close: vi.fn() }) } }));
vi.mock("../server/db.js", () => {
  const client = { passwordReset: { findUnique: mocks.findUnique, updateMany: mocks.updateMany, deleteMany: mocks.deleteMany }, user: { findUnique: mocks.userFind, update: mocks.userUpdate }, session: { deleteMany: mocks.sessionDelete }, $executeRaw: mocks.claim };
  return { db: () => ({ ...client, $transaction: (action: (tx: typeof client) => unknown) => action(client) }) };
});
import { passwordResetRouter, resetSchema } from "../server/password-reset.js";
async function call(path: string, body: object) {
  const route = passwordResetRouter.stack.find(layer => layer.route?.path === path)!.route!;
  const res = { statusCode: 200, body: {} as Record<string, unknown>, status(code: number) { this.statusCode = code; return this; }, json(value: Record<string, unknown>) { this.body = value; return this; } };
  await route.stack.at(-1)!.handle({ body }, res, () => {});
  return res;
}
beforeEach(() => { vi.clearAllMocks(); mocks.updateMany.mockResolvedValue({ count: 1 }); });
describe("password recovery", () => {
  it("rejects expired codes", async () => {
    mocks.findUnique.mockResolvedValue({ expiresAt: new Date(0), attempts: 0 });
    expect((await call("/verify", { email: "test@example.com", code: "123456" })).statusCode).toBe(400);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("locks out after five attempts", async () => {
    mocks.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60000), attempts: 5 });
    expect((await call("/verify", { email: "test@example.com", code: "123456" })).statusCode).toBe(400);
  });
  it("claims attempts and issues a grant only for the right code", async () => {
    const digest = (s: string) => createHmac("sha256", "test-secret-not-for-production-12345").update(s).digest("hex");
    const emailKey = digest("email:test@example.com");
    mocks.findUnique.mockResolvedValue({ emailKey, otpHash: digest(`${emailKey}:123456`), expiresAt: new Date(Date.now() + 60000), attempts: 0, userId: "user" });
    const result = await call("/verify", { email: "test@example.com", code: "123456" });
    expect(result.body.token).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.updateMany).toHaveBeenCalledTimes(2);
  });
  it("rejects replayed reset tokens", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await call("/complete", { token: "a".repeat(64), password: "new-password-123" })).statusCode).toBe(400);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
  it("rejects the current password without consuming the grant", async () => {
    mocks.findUnique.mockResolvedValue({ userId: "user", tokenExpiresAt: new Date(Date.now() + 60000) });
    mocks.userFind.mockResolvedValue({ id: "user", passwordHash: "hash" }); mocks.compare.mockResolvedValue(true);
    expect((await call("/complete", { token: "a".repeat(64), password: "old-password-123" })).statusCode).toBe(400);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
  it("updates the password and revokes sessions after consuming a grant", async () => {
    mocks.findUnique.mockResolvedValue({ emailKey: "key", userId: "user", tokenExpiresAt: new Date(Date.now() + 60000) });
    mocks.userFind.mockResolvedValue({ id: "user", passwordHash: "hash" }); mocks.compare.mockResolvedValue(false); mocks.hash.mockResolvedValue("new-hash"); mocks.deleteMany.mockResolvedValue({ count: 1 });
    expect((await call("/complete", { token: "a".repeat(64), password: "new-password-123" })).statusCode).toBe(200);
    expect(mocks.sessionDelete).toHaveBeenCalledWith({ where: { userId: "user" } });
  });
  it("rejects passwords above bcrypt's byte limit", () => {
    expect(resetSchema.safeParse({ token: "a".repeat(64), password: "😀".repeat(20) }).success).toBe(false);
  });
});
