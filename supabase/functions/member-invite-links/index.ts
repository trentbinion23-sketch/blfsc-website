import { createClient } from "npm:@supabase/supabase-js@2";
import { applyRateLimit, getClientIp } from "../_shared/security.ts";

type InviteRequest = {
  emails?: string[];
  recipients?: Array<{
    email?: string;
    phone?: string;
  }>;
  redirectTo?: string;
};

type SenderProfile = {
  user_id: string;
  email: string;
  is_admin: boolean;
  approved: boolean;
};

type InviteResult = {
  email: string;
  phone?: string;
  status: "ready" | "exists" | "error";
  action_link?: string;
  email_sent?: boolean;
  note?: string;
  error?: string;
  sms_status?: "sent" | "skipped" | "failed";
  sms_error?: string;
};

const corsBaseHeaders = {
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function getAllowedOrigins() {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  if (!configured) {
    return [
      "https://blfsc.com",
      "https://www.blfsc.com",
      "http://127.0.0.1:3000",
      "http://localhost:3000",
    ];
  }
  return configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function resolveAllowedOrigin(origin: string | null) {
  if (!origin) return null;
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin) ? origin : null;
}

function buildCorsHeaders(origin: string | null) {
  const allowedOrigin = resolveAllowedOrigin(origin);
  return {
    ...corsBaseHeaders,
    "access-control-allow-origin": allowedOrigin || getAllowedOrigins()[0] || "https://blfsc.com",
    vary: "origin",
  };
}

const json = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...buildCorsHeaders(origin),
      "content-type": "application/json; charset=utf-8",
    },
  });

function getEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getAccessToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const [, token = ""] = authHeader.match(/^Bearer\s+(.+)$/i) || [];
  return token.trim();
}

function normalizeEmails(emails?: string[]) {
  const seen = new Set<string>();
  const values = Array.isArray(emails) ? emails : [];
  return values
    .map((email) =>
      String(email || "")
        .trim()
        .toLowerCase(),
    )
    .filter((email) => {
      if (!email || seen.has(email)) return false;
      seen.add(email);
      return true;
    });
}

function normalizePhoneNumber(value?: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const compact = raw.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) {
    return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : "";
  }

  if (/^0?4\d{8}$/.test(compact)) {
    const local = compact.startsWith("0") ? compact.slice(1) : compact;
    return `+61${local}`;
  }

  if (/^61\d{9}$/.test(compact)) {
    return `+${compact}`;
  }

  return /^\d{8,15}$/.test(compact) ? `+${compact}` : "";
}

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeRedirectTo(value?: string) {
  if (!value) return undefined;
  try {
    return new URL(value).toString();
  } catch {
    throw new Error("redirectTo must be a valid absolute URL.");
  }
}

function classifyInviteError(message: string) {
  const text = message.toLowerCase();
  if (
    text.includes("already") ||
    text.includes("exists") ||
    text.includes("registered") ||
    text.includes("confirmed") ||
    text.includes("invited")
  ) {
    return "exists";
  }
  return "error";
}

function extractActionLink(payload: Record<string, unknown>) {
  const candidates = [
    payload.action_link,
    (payload.properties as Record<string, unknown> | undefined)?.action_link,
    (payload.properties as Record<string, unknown> | undefined)?.email_action_link,
    (payload.data as Record<string, unknown> | undefined)?.action_link,
    (
      (payload.data as Record<string, unknown> | undefined)?.properties as
        | Record<string, unknown>
        | undefined
    )?.action_link,
  ];

  const match = candidates.find((value) => typeof value === "string" && value.startsWith("http"));
  return typeof match === "string" ? match : "";
}

function getSmsProviderName() {
  return Deno.env.get("TWILIO_ACCOUNT_SID") ? "twilio" : "not_configured";
}

async function sendSms(input: { to: string; message: string }) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, skipped: true, error: "SMS provider not configured" };
  }

  const payload = new URLSearchParams({
    To: input.to,
    From: fromNumber,
    Body: input.message,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: payload,
    },
  );

  const data = await response.json().catch(() => ({}));
  return response.ok
    ? { ok: true, id: data.sid ?? null }
    : { ok: false, error: data?.message || "SMS provider rejected request" };
}

Deno.serve(
  async (req) => {
    const origin = req.headers.get("origin");
    if (origin && !resolveAllowedOrigin(origin)) {
      return json({ error: "Origin is not allowed." }, 403, origin);
    }

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: buildCorsHeaders(origin) });
    }

    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    try {
      const supabaseUrl = getEnv("SUPABASE_URL");
      const anonKey = getEnv("SUPABASE_ANON_KEY");
      const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
      const accessToken = getAccessToken(req);

      if (!accessToken) {
        return json({ error: "Missing bearer token." }, 401, origin);
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      });

      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser(accessToken);

      if (userError || !user) {
        return json({ error: "Unauthorized" }, 401, origin);
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data: senderProfileRow, error: senderProfileError } = await supabase
        .from("member_profiles")
        .select("user_id,email,is_admin,approved")
        .eq("user_id", user.id)
        .maybeSingle();

      if (senderProfileError) {
        if (senderProfileError.code === "42P01") {
          return json(
            {
              error:
                "Member invite tools are not configured yet. Run member_notifications.sql first.",
            },
            503,
            origin,
          );
        }
        throw senderProfileError;
      }

      const senderProfile = senderProfileRow as SenderProfile | null;
      if (!senderProfile?.is_admin || !senderProfile.approved) {
        return json({ error: "Only admins can generate member invite links." }, 403, origin);
      }

      const body = (await req.json()) as InviteRequest;
      const clientIp = getClientIp(req);
      let rateLimit = {
        allowed: true,
        retryAfterSeconds: 0,
      };
      try {
        rateLimit = await applyRateLimit({
          key: `member-invite-links:${senderProfile.user_id}:${clientIp}`,
          maxRequests: 10,
          windowMs: 60_000,
          supabaseUrl,
          serviceRoleKey,
        });
      } catch (error) {
        throw error;
      }
      if (!rateLimit.allowed) {
        return json(
          {
            error: `Too many invite requests. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
          },
          429,
          origin,
        );
      }

      const legacyRecipients = normalizeEmails(body.emails).map((email) => ({
        email,
      }));
      const requestRecipients = Array.isArray(body.recipients)
        ? body.recipients.map((recipient) => ({
            email: String(recipient.email || "")
              .trim()
              .toLowerCase(),
            phone: String(recipient.phone || "").trim(),
          }))
        : [];
      const recipients = requestRecipients.length ? requestRecipients : legacyRecipients;
      const invalidEmails = recipients
        .map((recipient) => recipient.email)
        .filter((email) => !emailLooksValid(email));
      const validRecipients = recipients.filter((recipient) => emailLooksValid(recipient.email));
      const invalidPhones = recipients
        .filter((recipient) => recipient.phone && !normalizePhoneNumber(recipient.phone))
        .map((recipient) => String(recipient.phone || ""));
      const redirectTo = normalizeRedirectTo(body.redirectTo);

      if (!validRecipients.length) {
        return json({ error: "Provide at least one valid email address." }, 400, origin);
      }

      const results: InviteResult[] = [];
      let smsSent = 0;
      let smsFailed = 0;
      let smsSkipped = 0;

      for (const recipient of validRecipients) {
        const email = recipient.email;
        const invitePayload = {
          invited_by: senderProfile.email,
          invite_source: "portal_admin",
        };

        const { error: inviteUserError } = await supabase.auth.admin.inviteUserByEmail(
          email,
          redirectTo ? { redirectTo, data: invitePayload } : { data: invitePayload },
        );

        const emailSent = !inviteUserError;
        const hasPhone = Boolean(String(recipient.phone || "").trim());
        const needInviteLink = hasPhone || !emailSent;

        let actionLink = "";
        if (needInviteLink) {
          const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: serviceRoleKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "invite",
              email,
              redirect_to: redirectTo,
              data: invitePayload,
            }),
          });

          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            const message = String(
              (payload as Record<string, unknown>).msg ||
                (payload as Record<string, unknown>).error_description ||
                (payload as Record<string, unknown>).error ||
                "Invite generation failed.",
            );

            if (emailSent && hasPhone) {
              results.push({
                email,
                phone: recipient.phone || undefined,
                status: "ready",
                email_sent: true,
                note: "Supabase emailed this invitation, but a link for SMS could not be generated. The member can use the email.",
                sms_status: "failed",
                sms_error: message,
              });
              smsFailed += 1;
            } else {
              results.push({
                email,
                phone: recipient.phone || undefined,
                status: classifyInviteError(message),
                error: message,
                note: "Review this member before sending another invite.",
              });
            }
            continue;
          }

          actionLink = extractActionLink(payload as Record<string, unknown>);
          if (!actionLink) {
            if (emailSent && hasPhone) {
              results.push({
                email,
                phone: recipient.phone || undefined,
                status: "ready",
                email_sent: true,
                note: "Supabase emailed this invitation, but no link was returned for SMS. The member can use the email.",
                sms_status: "failed",
                sms_error: "Supabase did not return an invite link for this email.",
              });
              smsFailed += 1;
            } else {
              results.push({
                email,
                phone: recipient.phone || undefined,
                status: "error",
                error: "Supabase did not return an invite link for this email.",
              });
            }
            continue;
          }
        }

        let smsStatus: InviteResult["sms_status"] = recipient.phone ? "skipped" : undefined;
        let smsError = "";

        if (recipient.phone && actionLink) {
          const smsTarget = normalizePhoneNumber(recipient.phone);
          if (!smsTarget) {
            smsStatus = "failed";
            smsError = "Phone number could not be normalized to an SMS target.";
            smsFailed += 1;
          } else {
            const smsResult = await sendSms({
              to: smsTarget,
              message: `BLFSC invite link: ${actionLink}\n\nUse this link to create your member account.`,
            });

            if (smsResult.ok) {
              smsStatus = "sent";
              smsSent += 1;
            } else if (smsResult.skipped) {
              smsStatus = "skipped";
              smsSkipped += 1;
              smsError = smsResult.error || "SMS provider not configured";
            } else {
              smsStatus = "failed";
              smsFailed += 1;
              smsError = smsResult.error || "SMS provider rejected request";
            }
          }
        }

        const noteForReady = (() => {
          if (emailSent && !actionLink) {
            return "Supabase sent an invitation email to this member. No copy link is needed.";
          }
          if (emailSent && hasPhone) {
            return smsStatus === "sent"
              ? "Invitation emailed and invite link texted."
              : "Invitation emailed. SMS status is shown below.";
          }
          if (actionLink && !emailSent) {
            return "Automatic email was not sent (check Auth email settings or existing user). Copy the link or resend from the dashboard.";
          }
          if (recipient.phone) {
            return smsStatus === "sent"
              ? "Invite link generated and texted to the member."
              : "Invite link generated. Text delivery needs Twilio or a valid phone number.";
          }
          return "Copy this invite link and send it to the member.";
        })();

        results.push({
          email,
          phone: recipient.phone || undefined,
          status: "ready",
          action_link: actionLink || undefined,
          email_sent: emailSent || undefined,
          note: noteForReady,
          sms_status: smsStatus,
          sms_error: smsError || undefined,
        });
      }

      return json(
        {
          requested: validRecipients.length,
          generated: results.filter((item) => item.status === "ready").length,
          emails_sent: results.filter((item) => item.email_sent).length,
          invalid_emails: invalidEmails,
          invalid_phones: invalidPhones,
          redirect_to: redirectTo || null,
          results,
          sms_sent: smsSent,
          sms_failed: smsFailed,
          sms_skipped: smsSkipped,
          sms_provider: getSmsProviderName(),
        },
        200,
        origin,
      );
    } catch (error) {
      return json(
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500,
        origin,
      );
    }
  },
  {
    onListen() {
      console.log("member-invite-links function ready");
    },
  },
);
