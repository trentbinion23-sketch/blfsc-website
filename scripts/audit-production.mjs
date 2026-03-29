import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ quiet: true });
dotenv.config({ path: ".env.local", override: true, quiet: true });

const defaultSiteUrl = "https://blfsc.com";
const defaultLegacyPagesUrl = "https://blfsc.pages.dev";
const defaultLegacyPagesProject = "blfsc";
const defaultLegacyWorkerName = "blfsc-phase1-preview";

const siteUrl = new URL(process.env.BLFSC_SITE_URL ?? defaultSiteUrl);
const portalUrl = new URL("/portal", siteUrl);
const wwwPortalUrl = new URL(portalUrl);
wwwPortalUrl.hostname = siteUrl.hostname.startsWith("www.")
  ? siteUrl.hostname
  : `www.${siteUrl.hostname}`;

const legacyPagesUrl = process.env.BLFSC_PAGES_URL ?? defaultLegacyPagesUrl;
const legacyPagesProject = process.env.BLFSC_LEGACY_PAGES_PROJECT ?? defaultLegacyPagesProject;
const legacyWorkerName = process.env.BLFSC_LEGACY_WORKER ?? defaultLegacyWorkerName;

/** Wrangler `login` stores an OAuth access token here (local dev only; not available in CI). */
function readWranglerOAuthTokenFromDisk() {
  try {
    const configPath = join(homedir(), ".wrangler", "config", "default.toml");
    if (!existsSync(configPath)) return null;
    const raw = readFileSync(configPath, "utf8");
    const match = raw.match(/^\s*oauth_token\s*=\s*"([^"]+)"/m);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function wranglerWhoamiDefaultAccountId() {
  try {
    const out = execSync("npx wrangler whoami --json", {
      cwd: process.cwd(),
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024,
    });
    const data = JSON.parse(out);
    return data.accounts?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

function resolveCloudflareCredentials() {
  const accountIdEnv = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || null;
  const apiTokenEnv = process.env.CLOUDFLARE_API_TOKEN?.trim() || null;
  const apiToken = apiTokenEnv || readWranglerOAuthTokenFromDisk();
  const accountId = accountIdEnv || (apiToken ? wranglerWhoamiDefaultAccountId() : null);
  return { accountId, apiToken };
}

const { accountId: cloudflareAccountId, apiToken: cloudflareApiToken } =
  resolveCloudflareCredentials();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchWithChecks(url) {
  const response = await fetch(url, {
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
    redirect: "manual",
  });

  return response;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TRANSIENT_5XX = new Set([502, 503, 504]);
const FETCH_TRANSIENT_MAX_ATTEMPTS = 6;
const FETCH_TRANSIENT_BACKOFF_BASE_MS = 2000;
const FETCH_TRANSIENT_BACKOFF_CAP_MS = 10_000;

/** Retries on transient edge 5xx (e.g. Cloudflare worker cold start / blip). */
async function fetchWithTransient5xxRetry(url) {
  for (let attempt = 1; attempt <= FETCH_TRANSIENT_MAX_ATTEMPTS; attempt++) {
    const response = await fetchWithChecks(url);
    if (
      !response.ok &&
      TRANSIENT_5XX.has(response.status) &&
      attempt < FETCH_TRANSIENT_MAX_ATTEMPTS
    ) {
      const delay = Math.min(
        FETCH_TRANSIENT_BACKOFF_CAP_MS,
        FETCH_TRANSIENT_BACKOFF_BASE_MS * 2 ** (attempt - 1),
      );
      await sleep(delay);
      continue;
    }
    return response;
  }
}

function getHeader(response, name) {
  return response.headers.get(name)?.toLowerCase() ?? "";
}

async function checkPortalUrl(url, label) {
  const response = await fetchWithTransient5xxRetry(url);
  assert(response.ok, `${label} returned ${response.status} instead of 200.`);
  assert(
    getHeader(response, "x-opennext") === "1",
    `${label} is not being served by the canonical OpenNext worker.`,
  );
  assert(
    getHeader(response, "cache-control").includes("no-store"),
    `${label} is missing the no-store cache guard.`,
  );
}

async function checkLegacyPagesUrl() {
  try {
    const response = await fetchWithTransient5xxRetry(legacyPagesUrl);
    assert(
      response.status >= 400,
      `${legacyPagesUrl} is still serving a live response (${response.status}).`,
    );
  } catch {
    // A retired hostname can fail DNS or TLS resolution entirely, which is also acceptable.
  }
}

async function callCloudflareApi(pathname) {
  assert(
    cloudflareAccountId && cloudflareApiToken,
    "Cloudflare API credentials are required for the Cloudflare resource audit.",
  );

  const response = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, {
    headers: {
      Authorization: `Bearer ${cloudflareApiToken}`,
    },
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

function hasCloudflareErrorCode(payload, expectedCode) {
  return payload?.success === false && payload.errors?.some((error) => error.code === expectedCode);
}

async function checkLegacyPagesProjectDeleted() {
  if (!cloudflareAccountId || !cloudflareApiToken) {
    return "Skipped Cloudflare Pages project audit (set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in env / .env.local, or run `wrangler login` for local OAuth).";
  }

  const { response, payload } = await callCloudflareApi(
    `/accounts/${cloudflareAccountId}/pages/projects/${legacyPagesProject}`,
  );

  const gone =
    hasCloudflareErrorCode(payload, 8000007) ||
    response.status === 404 ||
    (payload?.success === false &&
      Array.isArray(payload.errors) &&
      payload.errors.some((error) => /not\s*found|does not exist/i.test(String(error.message ?? ""))));

  if (gone) {
    return `Verified legacy Pages project "${legacyPagesProject}" is gone.`;
  }

  if (payload?.success === true && payload?.result?.name) {
    console.warn(
      `[audit] Legacy Pages project "${legacyPagesProject}" still exists in Cloudflare. Retire it when you no longer need the old hostname; portal/site checks above already passed.`,
    );
    return `Warning: legacy Pages project "${legacyPagesProject}" is still present (non-blocking).`;
  }

  const detail = JSON.stringify(payload?.errors ?? payload);
  assert(
    false,
    `Unexpected Cloudflare response while checking retired Pages project "${legacyPagesProject}" (${response.status}): ${detail}`,
  );
}

async function checkLegacyWorkerDeleted() {
  if (!cloudflareAccountId || !cloudflareApiToken) {
    return "Skipped legacy worker audit (set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN in env / .env.local, or run `wrangler login` for local OAuth).";
  }

  const { payload } = await callCloudflareApi(
    `/accounts/${cloudflareAccountId}/workers/scripts/${legacyWorkerName}/deployments`,
  );

  assert(
    hasCloudflareErrorCode(payload, 10007),
    `Unexpected Cloudflare response while checking retired worker "${legacyWorkerName}".`,
  );

  return `Verified legacy worker "${legacyWorkerName}" is gone.`;
}

async function main() {
  const notes = [];

  await checkPortalUrl(portalUrl, portalUrl.toString());
  await checkPortalUrl(wwwPortalUrl, wwwPortalUrl.toString());
  await checkLegacyPagesUrl();

  notes.push(await checkLegacyPagesProjectDeleted());
  notes.push(await checkLegacyWorkerDeleted());

  console.log("Production audit passed.");
  console.log(`- ${portalUrl} is served by the canonical OpenNext worker with no-store headers.`);
  console.log(
    `- ${wwwPortalUrl} is served by the canonical OpenNext worker with no-store headers.`,
  );
  console.log(`- ${legacyPagesUrl} no longer serves a live site.`);

  for (const note of notes) {
    console.log(`- ${note}`);
  }
}

main().catch((error) => {
  console.error(`Production audit failed: ${error.message}`);
  process.exitCode = 1;
});
