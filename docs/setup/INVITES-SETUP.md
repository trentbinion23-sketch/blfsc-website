# Member Invite Links Setup

This repo now includes a browser-driven admin flow for one-time member invite links.

Files:

- `src/app/portal/page.tsx`
- `src/app/portal/portal-runtime.js`
- `supabase/functions/member-invite-links/index.ts`

What it does:

- Lets the signed-in admin paste member emails into the portal.
- Lets the admin optionally add a phone number on the matching line so the invite link can be texted.
- Generates one-time invite links server-side using Supabase Auth admin APIs.
- Returns links to the admin UI so they can be copied or downloaded as CSV.

What still needs configuration:

- Run `supabase/member_notifications.sql` in Supabase so the admin profile check exists.
- Mark your admin account in `member_profiles`:
  - `update public.member_profiles set is_admin = true where email = 'your-admin@email.com';`
- Deploy the `member-invite-links` Edge Function.

Secrets required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` if you want the invite link texted to a phone number

Important note:

- The invite tool stays safer than a plain frontend form because the `service_role` key remains inside the Edge Function instead of the browser.
- Email is still required because Supabase invite links are email-backed. The phone number is only used to deliver the generated link by SMS.
- Invite links will only work if the `redirectTo` URL is allowed in your Supabase Auth URL configuration.
