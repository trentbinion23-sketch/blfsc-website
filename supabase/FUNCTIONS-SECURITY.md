# Supabase Function Security Notes

The production functions now expect JWT verification at the platform level and enforce additional checks in-code.

## Functions

- `member-broadcast`
- `member-invite-links`
- `order-notify`

These are configured in `supabase/config.toml` with:

- `verify_jwt = true`

## Required secrets

Set these in Supabase Edge Functions secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional but recommended:

- `RESEND_API_KEY`, `BROADCAST_FROM_EMAIL` (email delivery; also used by `order-notify`)
- `ORDER_NOTIFY_TO_EMAIL` — optional comma-separated addresses BCC’d on each order confirmation (club inbox)
- `PUBLIC_PORTAL_URL` or `NEXT_PUBLIC_SITE_URL` — link inserted in the member confirmation email (defaults to `https://blfsc.com/portal`)
- `SMTP_*` values (SMTP fallback)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (SMS)
- `ALLOWED_ORIGINS` (comma-separated CORS allowlist, for example `https://blfsc.com,https://www.blfsc.com,http://127.0.0.1:3000`)

## Security behavior

- Requests require a valid bearer token and authenticated user.
- **`member-broadcast`** and **`member-invite-links`**: the calling user must be an **approved admin** in `member_profiles`.
- **`order-notify`**: the caller must be an **approved member**. The function loads the order with the user-scoped Supabase client so only the **order owner** can trigger a confirmation email for that `order_id`.
- Function-level rate limits are applied per user and client IP (including `order-notify`: 24 calls per hour per user + IP).
- Rate limiting is persisted in Postgres via `consume_edge_rate_limit` RPC, so limits hold across function instances.
- If the rate-limit RPC is unavailable, `order-notify` fails closed; other functions may fail closed as implemented in each handler.
