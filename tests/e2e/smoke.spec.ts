import { expect, test } from "@playwright/test";
import {
  canonicalAppPaths,
  legacyHtmlRedirects,
  retiredPathRedirects,
} from "../../src/lib/site-routes";

test("home page renders key navigation", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByLabel("Primary navigation");
  await expect(nav.getByRole("link", { name: "Events" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "About" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Members" })).toBeVisible();
});

for (const path of canonicalAppPaths) {
  test(`canonical route ${path} resolves on the live app`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/$" : `${path}$`}`));
    await expect(page.locator("main").first()).toBeVisible();
  });
}

test("portal route goes straight to the member signin page", async ({ page }) => {
  await page.goto("/portal", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole("button", { name: "Access members area" })).toBeVisible();
});

for (const redirect of [...legacyHtmlRedirects, ...retiredPathRedirects]) {
  test(`${redirect.source} redirects to ${redirect.destination}`, async ({ page }) => {
    await page.goto(redirect.source, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      new RegExp(`${redirect.destination === "/" ? "/$" : `${redirect.destination}$`}`),
    );
  });
}

test("member portal auth flow works when credentials are provided", async ({ page }) => {
  const email = process.env.E2E_MEMBER_EMAIL;
  const password = process.env.E2E_MEMBER_PASSWORD;
  test.skip(
    !email || !password,
    "Set E2E_MEMBER_EMAIL and E2E_MEMBER_PASSWORD to run authenticated flow.",
  );

  await page.goto("/portal", { waitUntil: "domcontentloaded" });
  await page.fill("#email", email || "");
  await page.fill("#password", password || "");
  await page.click("#signin-btn");

  await expect(page.locator("#member-app")).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () => {
      const productGrid = page.locator("#product-grid");
      const emptyState = page.locator("#products-empty");
      return (await productGrid.isVisible()) || (await emptyState.isVisible());
    })
    .toBe(true);
});

test("admin portal tools load when admin credentials are provided", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL || process.env.E2E_MEMBER_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_MEMBER_PASSWORD;
  test.skip(
    !email || !password,
    "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the admin flow.",
  );

  await page.goto("/portal", { waitUntil: "domcontentloaded" });
  await page.fill("#email", email || "");
  await page.fill("#password", password || "");
  await page.click("#signin-btn");

  await expect(page.locator("#member-app")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("#admin-tab")).toHaveAttribute("aria-disabled", "false", {
    timeout: 20_000,
  });
  await page.click("#admin-tab");

  await expect(page.locator("#site-content-form")).toBeVisible();
  await expect(page.locator("#site-advanced-json")).toBeVisible();
  await expect(page.locator("#member-directory-status")).toBeVisible();
  await expect(
    page.locator("#member-directory-list:visible, #member-directory-empty:visible"),
  ).toBeVisible();
  await expect(page.locator("#merch-admin-form")).toBeVisible();
  await expect(page.locator("#member-broadcast-form")).toBeVisible();
  await expect(page.locator("#member-invite-form")).toBeVisible();
});
