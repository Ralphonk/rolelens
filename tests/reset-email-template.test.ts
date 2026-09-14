import { expect, it } from "vitest";
import { resetEmailTemplate } from "../server/reset-email-template.js";
it("includes code and security instructions in both formats", () => {
  const email = resetEmailTemplate("012345");
  for (const content of [email.html, email.text]) {
    expect(content).toContain("012345");
    expect(content).toContain("10 minutes");
    expect(content).toContain("password hasn't changed");
  }
  expect(email.html).not.toMatch(/<script|<img|https?:\/\//);
});
it("rejects non-code content before interpolating HTML", () => {
  expect(() => resetEmailTemplate('<img src=x>')).toThrow();
});
