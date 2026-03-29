# BLFSC On-Call Quick Check

Use this for a rapid production health check.

## 60-second site check

- Open:
  - `https://blfsc.com/`
  - `https://blfsc.com/portal`
- Confirm pages render and navigation works.

## API/security quick check

- Confirm unauthenticated calls are blocked:
  - `member-broadcast` -> should return `401`
  - `member-invite-links` -> should return `401`
- Confirm legacy Turnstile endpoint is safely disabled:
  - `POST /api/turnstile/verify` -> `200` with `disabled: true`

## Dashboard quick scan

- Sentry: check new critical errors in last 24h.
- Cloudflare: check worker errors and traffic spikes.
- Supabase: check function logs for `500` and unusual `429`.
- PostHog: confirm events are still ingesting.

## If something is broken

1. Identify scope:
   - public site only
   - portal only
   - Supabase functions only
2. Check latest deployment timestamp/version.
3. If needed, roll back to previous known-good deployment.
4. Post a short incident note:
   - impact
   - start time
   - mitigation
   - next update time

## Critical secrets to verify

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- provider secrets (Resend/SMTP/Twilio) if in use
