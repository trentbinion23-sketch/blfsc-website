import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

import lighthouseConfig from "../.lighthouserc.cjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, ".lighthouseci");

const collectConfig = lighthouseConfig?.ci?.collect ?? {};
const assertConfig = lighthouseConfig?.ci?.assert?.assertions ?? {};
const urls = Array.isArray(collectConfig.url) ? collectConfig.url : [];
const runsPerUrl = Math.max(1, Number(collectConfig.numberOfRuns) || 1);

mkdirSync(outputDir, { recursive: true });

function slugifyUrl(url) {
  return String(url)
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function formatPercent(score) {
  if (typeof score !== "number") return "n/a";
  return `${Math.round(score * 100)}%`;
}

function getCategoryAssertions() {
  return Object.entries(assertConfig)
    .filter(([key]) => key.startsWith("categories:"))
    .map(([key, value]) => {
      const [level, options = {}] = Array.isArray(value) ? value : [value, {}];
      return {
        categoryId: key.split(":")[1],
        level: String(level || "error"),
        minScore: typeof options.minScore === "number" ? options.minScore : 0,
      };
    });
}

async function cleanupProfile(profileDir) {
  try {
    rmSync(profileDir, { recursive: true, force: true, maxRetries: 10 });
  } catch {
    // Windows can briefly hold onto profile files after Chrome exits.
  }
}

async function runLighthouse(url, runIndex) {
  const slug = `${slugifyUrl(url)}-run-${runIndex + 1}`;
  const profileDir = path.join(outputDir, "chrome-profile", slug);
  rmSync(profileDir, { recursive: true, force: true });
  mkdirSync(profileDir, { recursive: true });

  const chrome = await launch({
    chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"],
    userDataDir: profileDir,
  });

  try {
    const result = await lighthouse(url, {
      logLevel: "error",
      output: ["json", "html"],
      port: chrome.port,
    });

    if (!result?.lhr || !Array.isArray(result.report)) {
      throw new Error(`Lighthouse did not return the expected report payload for ${url}.`);
    }

    const [jsonReport, htmlReport] = result.report;
    writeFileSync(path.join(outputDir, `${slug}.report.json`), jsonReport);
    writeFileSync(path.join(outputDir, `${slug}.report.html`), htmlReport);

    return result.lhr;
  } finally {
    try {
      await Promise.resolve(chrome.kill());
    } catch {
      // Ignore cleanup failures from ChromeLauncher and keep report evaluation intact.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await cleanupProfile(profileDir);
  }
}

const categoryAssertions = getCategoryAssertions();
const failures = [];
const warnings = [];

for (const url of urls) {
  for (let runIndex = 0; runIndex < runsPerUrl; runIndex += 1) {
    const lhr = await runLighthouse(url, runIndex);
    console.log(`Lighthouse ${url} (run ${runIndex + 1}/${runsPerUrl})`);

    for (const assertion of categoryAssertions) {
      const score = lhr.categories?.[assertion.categoryId]?.score;
      const message = `${url} ${assertion.categoryId} ${formatPercent(score)} (min ${formatPercent(assertion.minScore)})`;

      if (typeof score !== "number" || score < assertion.minScore) {
        if (assertion.level === "warn") {
          warnings.push(message);
          console.warn(`WARN  ${message}`);
        } else {
          failures.push(message);
          console.error(`FAIL  ${message}`);
        }
        continue;
      }

      console.log(`PASS  ${message}`);
    }
  }
}

if (warnings.length) {
  console.warn(`Lighthouse warnings: ${warnings.length}`);
}

if (failures.length) {
  console.error(`Lighthouse failures: ${failures.length}`);
  process.exitCode = 1;
}
