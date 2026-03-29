# BLFSC Site

This repository is the canonical production app for `blfsc.com`.

Legacy static files and captures now live under `archive/` and operational notes live under
`docs/`, so the repo root stays aligned with the real production app.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run check
```

`check` runs formatting, linting, type checking, and unit tests in one pass.

If you need to run individual checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
```

To inspect webpack bundle output locally:

```bash
npm run analyze
```

## Cloudflare deployment

The app uses OpenNext for Cloudflare Workers.

```bash
npm run deploy
```

Configured routes live in `wrangler.jsonc`.

There is now one production runtime only:

- Worker service: `blfsc-site`
- Custom domains: `blfsc.com`, `www.blfsc.com`
- No Pages project should be attached to those domains

### Production build environment (`NEXT_PUBLIC_*`)

Client-side Supabase settings are read from `process.env` at **`next build` time** (see [`src/lib/site-config.ts`](src/lib/site-config.ts)) and baked into the OpenNext bundle. Wrong or stale values break the members portal (`Failed to fetch`, wrong API host).

**Source of truth before every production build:**

- [`\.env.production`](.env.production) and/or the same variables in CI / Cloudflare build secrets.
- If you use Wrangler locally, [`\.dev.vars`](.dev.vars) is often injected during build—keep its `NEXT_PUBLIC_SUPABASE_*` values aligned with production.

**Pre-deploy checklist**

1. In Supabase Dashboard → **Settings → API Keys**, copy the **publishable** key and project URL.
2. Confirm they match `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the environment used for `npm run deploy`.
3. After deploy, smoke-test [`https://blfsc.com/portal`](https://blfsc.com/portal) or run Playwright with `PLAYWRIGHT_BASE_URL=https://blfsc.com npm run test:e2e` (public routes only unless `E2E_*` secrets are set).

### Production audit

After deploys:

```bash
npm run audit:production
```

[`scripts/audit-production.mjs`](scripts/audit-production.mjs) always checks that `blfsc.com` / `www` portal responses come from the OpenNext worker (`x-opennext: 1`) and use `no-store` caching, and that the legacy Pages hostname does not serve a live site.

HTTP fetches in that script retry up to six times when the response status is `502`, `503`, or `504`, waiting with exponential backoff (2s then doubling, capped at 10s) between attempts, so brief edge or worker blips do not fail CI or local audits.

**Full audit (unskips API checks):** use a token that can call the Cloudflare API for your account (Pages project lookup + Workers script deployments). [`scripts/audit-production.mjs`](scripts/audit-production.mjs) loads `.env` then `.env.local`, so you can set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` there (gitignored). **Locally**, if you already ran **`wrangler login`**, the audit reuses that OAuth token from `~/.wrangler/config` and resolves the default account via `npx wrangler whoami --json`, so you may not need `.env.local` for Cloudflare at all. **CI** still needs the two values as repository secrets. The script then verifies the retired Pages project and legacy worker names no longer exist.

Optional environment overrides: `BLFSC_SITE_URL`, `BLFSC_PAGES_URL`, `BLFSC_LEGACY_PAGES_PROJECT`, `BLFSC_LEGACY_WORKER` (see [`.env.example`](.env.example)).

### Dependency hygiene

CI runs `npm audit --omit=dev --audit-level=high`. Periodically run full `npm audit` locally and triage dev-only advisories; do not relax the production audit gate without review.

### Cloudflare Web Analytics and CSP

By default, the Content Security Policy blocks `https://static.cloudflareinsights.com` (the Web Analytics beacon). To allow it, set `CSP_ALLOW_CLOUDFLARE_INSIGHTS=true` in the environment used for `next build` / deploy (see [`.env.example`](.env.example)). If the browser still reports CSP violations, check the Network tab for additional hostnames and extend [`next.config.ts`](next.config.ts) accordingly.

### Scheduled production smoke tests

[`.github/workflows/prod-smoke.yml`](.github/workflows/prod-smoke.yml) runs on a daily schedule and on manual **workflow_dispatch**. It includes:

- **`production-audit`** — runs [`scripts/audit-production.mjs`](scripts/audit-production.mjs) (HTTP checks always). Add repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to unskip the retired Pages project and legacy worker API checks (same as local full audit).
- **`public-smoke`** — Playwright against `https://blfsc.com` for public routes only.
- **`auth-smoke`** — runs after public smoke when `E2E_MEMBER_EMAIL` and `E2E_MEMBER_PASSWORD` are set; optionally add `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` (see [`tests/e2e/smoke.spec.ts`](tests/e2e/smoke.spec.ts) for fallback behavior).

## Portal troubleshooting (sign-in vs features)

If Auth sign-in works but member features fail, triage in this order:

1. **Supabase Auth** — User exists, email provider enabled, address confirmed in Dashboard → **Authentication** → **Users**.
2. **`member_profiles`** — Row for the user’s `auth.users.id`: `approved`, `is_admin`, and any sync triggers defined in [`supabase/migrations/`](supabase/migrations).
3. **RLS** — Policies on tables the portal uses (e.g. products, `site_content`, chat, orders) match the member/admin paths in those migrations.
4. **Edge Functions** — Deployed, `verify_jwt` and secrets correct per [`supabase/FUNCTIONS-SECURITY.md`](supabase/FUNCTIONS-SECURITY.md).

Avoid repeated full codebase audits after small changes; use `npm run check`, `npm run audit:production`, and optional prod smoke tests instead.

## Production routing notes

- Canonical routes are App Router paths (for example `/events`, `/merch`, `/contact`).
- Legacy `.html` public pages are redirected to canonical routes in `next.config.ts`.
- Members should use `/portal`; `/portal.html` is now a legacy redirect to the app route.
