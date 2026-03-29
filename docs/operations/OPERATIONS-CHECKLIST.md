# BLFSC Operations Checklist

Use this checklist to keep the BLFSC production stack healthy across Cloudflare, Supabase, Sentry, and PostHog.

## Daily 2-minute check

- Confirm `https://blfsc.com/` and `https://blfsc.com/portal` load.
- Open the portal and verify the sign-in screen renders correctly.
- Check Cloudflare Worker status for new runtime errors.

## Weekly reliability checks

### Sentry

- Review new issues from the last 7 days.
- Prioritize failures from:
  - `/api/contact`
  - portal auth/cart/order flows
- Resolve actionable errors and mute noisy non-actionable ones.

### Supabase

- Check Edge Function logs for:
  - `member-broadcast`
  - `member-invite-links`
- Watch for spikes in `401`, `403`, `429`, `500`.
- Confirm no policy regressions in RLS-protected operations.

### Cloudflare

- Confirm deployed version is healthy.
- Verify routes still point to the expected worker.
- Confirm there is no leftover Pages project or alternate production hostname serving the site.
- Review request/error trends, especially 5xx rates.

## Weekly product checks

### PostHog

- Review funnel trend:
  - nav/CTA click -> portal open -> sign-in success
- Check for major drop-offs by page.
- Confirm events are still being ingested.

## Weekly security checks

- Verify required secrets are present:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - provider secrets (Resend/SMTP/Twilio), if enabled
- Ensure non-admin calls are still blocked on admin functions.
- Rotate sensitive keys on your chosen schedule (recommended every 60-90 days).

## Release checklist (every deploy)

- Run quality gates:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - Playwright smoke tests
- Deploy app and functions.
- Run `npm run audit:production`.
- Re-test production routes:
  - `/`
  - `/events`
  - `/contact`
  - `/portal`
- Verify `/portal.html` redirects to `/portal`
- Verify `https://blfsc.pages.dev/` does not serve a live site anymore.
- Verify legacy Turnstile endpoint remains disabled:
  - `POST /api/turnstile/verify` returns `200` with `disabled: true`.
- Verify telemetry:
  - Sentry receives events after release.
  - PostHog captures key funnel events.

## Monthly maintenance

- Update key dependencies (`next`, `wrangler`, `@sentry/nextjs`, `posthog-js`, Supabase CLI).
- Re-run Lighthouse and compare against prior baseline.
- Review and tune error/availability alert thresholds.
