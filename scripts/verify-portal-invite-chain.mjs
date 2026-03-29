/**
 * Validates local env + reachable Supabase endpoints used by Admin → Invites.
 * Loads .env.production, then merges non-overriding keys from .dev.vars (wrangler).
 * Does not print secret values.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)?$/.exec(line);
    if (!m) continue;
    let v = (m[2] ?? "").trim().replace(/^["']|["']$/g, "");
    out[m[1]] = v;
  }
  return out;
}

function mask(s, show = 6) {
  if (!s || s.length <= show) return s ? "(set)" : "(missing)";
  return `${s.slice(0, show)}…(${s.length} chars)`;
}

const prod = parseEnvFile(path.join(rootDir, ".env.production"));
const devVars = parseEnvFile(path.join(rootDir, ".dev.vars"));
const env = { ...devVars, ...prod };

const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").trim();
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const projectRefPath = path.join(rootDir, "supabase", ".temp", "project-ref");

let failed = false;
const ok = (msg) => console.log(`  OK  ${msg}`);
const bad = (msg) => {
  console.error(`  BAD ${msg}`);
  failed = true;
};

console.log("verify-portal-invite-chain: env summary");
console.log(`  NEXT_PUBLIC_SITE_URL       ${mask(siteUrl, 24)}`);
console.log(`  NEXT_PUBLIC_SUPABASE_URL   ${mask(supabaseUrl, 40)}`);
console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY ${mask(anonKey)}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY  ${mask(serviceKey)}`);

if (!siteUrl) bad("NEXT_PUBLIC_SITE_URL is missing (add to .env.production for builds).");
else ok("NEXT_PUBLIC_SITE_URL set");

if (!supabaseUrl) bad("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) missing.");
else ok("Supabase URL set");

if (!anonKey)
  bad("NEXT_PUBLIC_SUPABASE_ANON_KEY missing — portal cannot sign in or call Edge Functions.");
else ok("Publishable / anon key present");

if (!anonKey?.startsWith("sb_publishable_") && !anonKey?.startsWith("eyJ"))
  console.log("  WARN key is neither sb_publishable_ nor legacy JWT; confirm in Dashboard → API.");

if (existsSync(projectRefPath)) {
  const linked = readFileSync(projectRefPath, "utf8").trim().toLowerCase();
  try {
    const host = new URL(supabaseUrl).hostname.toLowerCase();
    const ref = /^([a-z0-9]+)\.supabase\.co$/i.exec(host)?.[1];
    if (ref && ref !== linked) {
      bad(
        `Supabase URL ref (${ref}) != supabase link (${linked}). Run npm run verify:supabase-env`,
      );
    } else if (ref) ok(`Project ref matches supabase link (${linked})`);
  } catch {
    bad("Invalid NEXT_PUBLIC_SUPABASE_URL");
  }
}

if (!supabaseUrl || !anonKey) {
  console.error("\nFix .env.production (see .env.example). Exiting.");
  process.exit(1);
}

console.log("\nverify-portal-invite-chain: HTTP checks");

const authHealth = await fetch(`${supabaseUrl}/auth/v1/health`, {
  headers: { apikey: anonKey },
});
if (authHealth.ok) ok(`GET /auth/v1/health → ${authHealth.status}`);
else bad(`GET /auth/v1/health → ${authHealth.status}`);

const inviteNoAuth = await fetch(`${supabaseUrl}/functions/v1/member-invite-links`, {
  method: "POST",
  headers: {
    apikey: anonKey,
    "Content-Type": "application/json",
  },
  body: "{}",
});
if (inviteNoAuth.status === 401) ok("POST member-invite-links without Bearer → 401 (expected)");
else bad(`POST member-invite-links without Bearer → ${inviteNoAuth.status} (expected 401)`);

const portalOrigin = new URL(siteUrl || "https://blfsc.com").origin;
const cors = await fetch(`${supabaseUrl}/functions/v1/member-invite-links`, {
  method: "OPTIONS",
  headers: {
    Origin: portalOrigin,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "authorization,apikey,content-type",
  },
});
const allow = cors.headers.get("access-control-allow-origin");
if (cors.ok && allow && (allow === portalOrigin || allow === "*"))
  ok(`CORS preflight for Origin ${portalOrigin} → allow ${allow}`);
else if (cors.ok && allow)
  console.log(`  WARN CORS allow-origin is ${allow} (portal is ${portalOrigin})`);
else bad(`CORS preflight failed (${cors.status})`);

const altOrigins = [];
if (portalOrigin === "https://blfsc.com") altOrigins.push("https://www.blfsc.com");
if (portalOrigin === "https://www.blfsc.com") altOrigins.push("https://blfsc.com");
for (const alt of altOrigins) {
  const ac = await fetch(`${supabaseUrl}/functions/v1/member-invite-links`, {
    method: "OPTIONS",
    headers: {
      Origin: alt,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,apikey,content-type",
    },
  });
  const al = ac.headers.get("access-control-allow-origin");
  if (ac.ok && al === alt) ok(`CORS preflight for Origin ${alt} → allow ${al}`);
  else bad(`CORS preflight for Origin ${alt} failed (${ac.status}, allow=${al ?? "none"})`);
}

if (serviceKey) {
  const adminProbe = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (adminProbe.ok || adminProbe.status === 422)
    ok(`Auth admin API reachable (${adminProbe.status})`);
  else
    bad(
      `Auth admin API ${adminProbe.status} — check SUPABASE_SERVICE_ROLE_KEY (use secret key from Dashboard)`,
    );
} else {
  console.log("  SKIP service-role admin probe (SUPABASE_SERVICE_ROLE_KEY not in env files)");
}

console.log(
  "\nDashboard checklist (manual): Authentication → URL configuration must include:",
  `${portalOrigin}/portal`,
  "and https://www.blfsc.com/portal if you use www. Enable email or SMTP so invite emails send.",
);

if (failed) {
  console.error("\nverify-portal-invite-chain: FAILED\n");
  process.exit(1);
}
console.log("\nverify-portal-invite-chain: all automated checks passed.\n");
