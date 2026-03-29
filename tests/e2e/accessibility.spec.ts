import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("accessibility checks", () => {
  test("homepage has no serious accessibility violations", async ({ page }) => {
    test.skip(
      process.env.RUN_A11Y_TESTS !== "true",
      "Set RUN_A11Y_TESTS=true to run axe accessibility checks.",
    );

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main");

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();

    const seriousViolations = violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(seriousViolations).toEqual([]);
  });
});
