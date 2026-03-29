import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portalSourcePath = path.join(rootDir, "src", "app", "portal", "portal-source.html");
const portalMarkupPath = path.join(rootDir, "src", "app", "portal", "portal-markup.ts");
const checkMode = process.argv.includes("--check");

const source = readFileSync(portalSourcePath, "utf8");
const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const cleanedMarkup = (bodyMatch ? bodyMatch[1] : source)
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .trim();
const nextContent = `export const portalMarkup = ${JSON.stringify(cleanedMarkup)};\n`;
const currentContent = readFileSync(portalMarkupPath, "utf8");

if (checkMode) {
  if (currentContent !== nextContent) {
    console.error("portal-markup.ts is out of date. Run: npm run portal:sync-markup");
    process.exit(1);
  }
  process.exit(0);
}

writeFileSync(portalMarkupPath, nextContent);
