/**
 * Ensures .env.production NEXT_PUBLIC_SUPABASE_URL matches the CLI-linked project ref
 * (supabase/.temp/project-ref). Run before deploy: npm run verify:supabase-env
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const refPath = path.join(rootDir, "supabase", ".temp", "project-ref");
const envPath = path.join(rootDir, ".env.production");

function extractProjectRefFromUrl(url) {
  try {
    const host = new URL(url.trim()).hostname;
    const m = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function readEnvProductionUrl() {
  if (!existsSync(envPath)) {
    console.warn("verify-supabase-env: .env.production not found (skip).");
    return null;
  }
  const raw = readFileSync(envPath, "utf8");
  const m = /^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/m.exec(raw);
  if (!m) {
    console.warn("verify-supabase-env: NEXT_PUBLIC_SUPABASE_URL missing in .env.production.");
    return null;
  }
  return m[1].trim().replace(/^["']|["']$/g, "");
}

if (!existsSync(refPath)) {
  console.warn(
    "verify-supabase-env: supabase/.temp/project-ref missing (run supabase link?). Exit 0.",
  );
  process.exit(0);
}

const linkedRef = readFileSync(refPath, "utf8").trim().toLowerCase();
const envUrl = readEnvProductionUrl();
if (!envUrl) {
  process.exit(0);
}

const envRef = extractProjectRefFromUrl(envUrl);
if (!envRef) {
  console.error(
    "verify-supabase-env: could not parse project ref from NEXT_PUBLIC_SUPABASE_URL:",
    envUrl,
  );
  process.exit(1);
}

if (envRef !== linkedRef) {
  console.error(
    "verify-supabase-env: MISMATCH.\n" +
      `  .env.production host ref: ${envRef}\n` +
      `  supabase link ref:       ${linkedRef}\n` +
      "  Migrations (db push) apply to the linked project; the site must use the same URL/key pair.",
  );
  process.exit(1);
}

console.log(`verify-supabase-env: OK — ${envRef}.supabase.co matches CLI-linked project.`);
