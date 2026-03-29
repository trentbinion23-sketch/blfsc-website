import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portalSourcePath = path.join(rootDir, "src", "app", "portal", "portal-source.html");
const portalMarkupPath = path.join(rootDir, "src", "app", "portal", "portal-markup.ts");

const source = readFileSync(portalSourcePath, "utf8");
const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const cleanedMarkup = (bodyMatch ? bodyMatch[1] : source)
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .trim();

writeFileSync(portalMarkupPath, `export const portalMarkup = ${JSON.stringify(cleanedMarkup)};\n`);
