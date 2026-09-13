import { test, expect } from "@playwright/test";
test("sample preview works without an account", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Preview my match" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Try a sample" }).click();
  await page.getByRole("button", { name: "Preview my match" }).click();
  await expect(
    page.getByRole("region", { name: "Match report" }),
  ).toBeVisible();
  await expect(
    page.getByText("Local keyword preview · No AI request was made."),
  ).toBeVisible();
  await expect(page.getByText("Docker", { exact: true }).first()).toBeVisible();
});
test("library asks guests to sign in and auth dialog is accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "My resumes", exact: true }).click();
  await page
    .getByRole("button", { name: "Create your workspace", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("mobile has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
