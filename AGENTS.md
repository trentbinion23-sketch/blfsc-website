<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Project overview

Single Next.js 16 app (App Router, Turbopack) for BLFSC.com — a motorcycle club community site with public pages and a member portal backed by Supabase. Deployed to Cloudflare Workers via OpenNext.

### Node version

The repo requires **Node 24** (see `.nvmrc`). Use `nvm use` to activate it.

### Quick reference

| Task               | Command                                                                    |
| ------------------ | -------------------------------------------------------------------------- |
| Install deps       | `npm install`                                                              |
| Dev server         | `npm run dev` (port 3000)                                                  |
| All quality checks | `npm run check`                                                            |
| Lint only          | `npm run lint`                                                             |
| Format check       | `npm run format:check`                                                     |
| Type check         | `npm run typecheck`                                                        |
| Unit tests         | `npm run test:unit`                                                        |
| E2E tests          | `npm run test:e2e` (needs Playwright browsers: `npm run test:e2e:install`) |

### Environment

- Copy `.env.example` to `.env.local` for local development. The app gracefully degrades when Supabase credentials are not configured — public pages render with hardcoded defaults, but the member portal requires real Supabase credentials.
- No Docker or local database required; the backend is fully Supabase-hosted.

### Gotchas

- `npm run typecheck` runs `next typegen` first to generate route types — do not skip this step.
- Husky pre-commit runs `lint-staged` (Prettier); pre-push runs `npm run verify:push` (format + lint + typecheck + unit tests + npm audit). If you need to bypass hooks during setup, use `--no-verify`.
- The `build` script uses `--webpack` flag (not Turbopack) since OpenNext/Cloudflare requires webpack. Dev uses Turbopack by default.
- Supabase Edge Functions (in `supabase/`) use Deno runtime and are deployed separately via Supabase CLI — not part of the Next.js build.
