# Member Notifications Setup

This repo now includes backend scaffolding for member broadcasts only.

Files:

- `supabase/member_notifications.sql`
- `supabase/functions/member-broadcast/index.ts`

What the scaffold covers:

- A `member_profiles` table for directory and notification preferences.
- A `member_broadcasts` table for message drafts and send history.
- A `member_broadcast_deliveries` table for per-recipient delivery logs.
- A Supabase Edge Function template that can send email first and SMS optionally.
- A trigger that mirrors new auth users into `member_profiles` so the directory starts itself.

What still needs configuration:

- Run the SQL file in Supabase.
- Mark exactly one account as admin, for example:
  - `update public.member_profiles set is_admin = true where email = 'your-admin@email.com';`
- Create the Edge Function secrets:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `BROADCAST_FROM_EMAIL`
  - Either `RESEND_API_KEY` for Resend email, or generic SMTP secrets:
    - `SMTP_HOST`
    - `SMTP_PORT`
    - `SMTP_USER`
    - `SMTP_PASS`
    - `SMTP_FROM_EMAIL`
    - optional `SMTP_FROM_NAME`
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` for SMS
- Decide how member profiles will be created and maintained.
- Deploy the `member-broadcast` Edge Function.
- Use the portal admin tab while signed in as the admin account.
- Decide whether `approved` should stay true by default for invited members, or whether you want a manual approval step.

Important note:

- SMS delivery is only a scaffold until you add consent, phone collection, and a provider account.
- The invite-link tool can also text a one-time invite link to a phone number if you supply one and configure Twilio.
- The function is designed to be called by a signed-in admin account. It uses the admin member profile instead of a browser-exposed secret token.
- Outlook.com password-based SMTP is no longer a reliable option for third-party senders because Microsoft moved Outlook accounts to modern authentication. If you want live delivery, use Resend or another SMTP provider that still supports app-password or relay credentials.
