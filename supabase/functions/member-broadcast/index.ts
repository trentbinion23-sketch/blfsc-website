import { createClient } from "@supabase/supabase-js";
import nodemailer from "npm:nodemailer@6.10.1";
import { applyRateLimit, getClientIp } from "../_shared/security.ts";

type BroadcastRequest = {
  subject: string;
  message: string;
  channels?: Array<"email" | "sms">;
  audience?: "approved_members" | "all_members";
  dryRun?: boolean;
};

type MemberProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  approved: boolean;
  notify_email: boolean;
  notify_sms: boolean;
};

type SenderProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  approved: boolean;
};

type DeliveryResult = {
  user_id: string;
  channel: "email" | "sms";
  delivery_target: string;
  status: "sent" | "failed" | "skipped";
  id?: string | null;
  error?: string;
  reason?: string;
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

function normalizeChannels(channels?: BroadcastRequest["channels"]) {
  const allowed = new Set(["email", "sms"]);
  const next = (channels && channels.length ? channels : ["email"]).filter(
    (channel): channel is "email" | "sms" => allowed.has(channel),
  );
  return next.length ? next : ["email"];
}

function normalizeAudience(audience?: BroadcastRequest["audience"]) {
  return audience === "all_members" ? "all_members" : "approved_members";
}

function buildMemberName(member: MemberProfile) {
  return member.full_name?.trim() || member.email.split("@")[0] || "Member";
}

let smtpTransport: nodemailer.Transporter | null = null;

function getEmailProviderName() {
  if (Deno.env.get("RESEND_API_KEY") && Deno.env.get("BROADCAST_FROM_EMAIL")) {
    return "resend";
  }

  if (
    Deno.env.get("SMTP_HOST") &&
    Deno.env.get("SMTP_USER") &&
    Deno.env.get("SMTP_PASS") &&
    (Deno.env.get("SMTP_FROM_EMAIL") || Deno.env.get("BROADCAST_FROM_EMAIL"))
  ) {
    return "smtp";
  }

  return "not_configured";
}

function getSmsProviderName() {
  return Deno.env.get("TWILIO_ACCOUNT_SID") ? "twilio" : "not_configured";
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(Deno.env.get("SMTP_PORT") || "587");
  const secure = Deno.env.get("SMTP_SECURE")
    ? Deno.env.get("SMTP_SECURE") === "true"
    : port === 465;

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return smtpTransport;
}

async function sendEmail(input: { to: string; subject: string; message: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("BROADCAST_FROM_EMAIL");
  if (!apiKey || !from) {
    const transporter = getSmtpTransport();
    const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || Deno.env.get("BROADCAST_FROM_EMAIL");
    const fromName = Deno.env.get("SMTP_FROM_NAME") || "BLFSC Members";

    if (!transporter || !fromEmail) {
      return {
        ok: false,
        skipped: true,
        error: "Email provider not configured",
      };
    }

    try {
      const info = await transporter.sendMail({
        from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
        to: input.to,
        subject: input.subject,
        text: input.message,
      });

      return { ok: true, id: info.messageId ?? null };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "SMTP provider rejected request",
      };
    }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.message,
    }),
  });

  const data = await response.json().catch(() => ({}));
  return response.ok
    ? { ok: true, id: data.id ?? null }
    : { ok: false, error: data?.message || "Email provider rejected request" };
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

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
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

      const { data: senderProfileRow, error: senderProfileError } = await supabase
        .from("member_profiles")
        .select("user_id,email,full_name,is_admin,approved")
        .eq("user_id", user.id)
        .maybeSingle();

      if (senderProfileError) {
        if (senderProfileError.code === "42P01") {
          return json(
            {
              error:
                "Member notifications are not configured yet. Run member_notifications.sql first.",
            },
            503,
            origin,
          );
        }
        throw senderProfileError;
      }

      const senderProfile = senderProfileRow as SenderProfile | null;

      if (!senderProfile) {
        return json(
          {
            error:
              "No member profile found for this account yet. Re-run the notifications SQL or create the profile row first.",
          },
          403,
          origin,
        );
      }

      if (!senderProfile.is_admin || !senderProfile.approved) {
        return json({ error: "Only admins can send broadcasts." }, 403, origin);
      }

      const body = (await req.json()) as BroadcastRequest;
      const clientIp = getClientIp(req);
      let rateLimit = {
        allowed: true,
        retryAfterSeconds: 0,
      };
      try {
        rateLimit = await applyRateLimit({
          key: `member-broadcast:${senderProfile.user_id}:${clientIp}`,
          maxRequests: 8,
          windowMs: 60_000,
          supabaseUrl,
          serviceRoleKey,
        });
      } catch (error) {
        console.error(
          "member-broadcast: consume_edge_rate_limit failed",
          error instanceof Error ? error.message : error,
        );
        return json(
          {
            error:
              "Rate limiting is temporarily unavailable. Try again in a moment, or verify the consume_edge_rate_limit migration is applied.",
          },
          503,
          origin,
        );
      }
      if (!rateLimit.allowed) {
        return json(
          {
            error: `Too many broadcast requests. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
          },
          429,
          origin,
        );
      }

      const subject = body.subject?.trim();
      const message = body.message?.trim();
      const channels = normalizeChannels(body.channels);
      const audience = normalizeAudience(body.audience);
      const dryRun = Boolean(body.dryRun);

      if (!subject || !message) {
        return json({ error: "Both subject and message are required." }, 400, origin);
      }

      const { data: broadcast, error: broadcastError } = await supabase
        .from("member_broadcasts")
        .insert({
          created_by: senderProfile.user_id,
          subject,
          message,
          channels,
          audience,
          status: dryRun ? "draft" : "queued",
        })
        .select("id, subject, message, channels, audience, status")
        .single();

      if (broadcastError) {
        throw broadcastError;
      }

      let membersQuery = supabase
        .from("member_profiles")
        .select("user_id,email,full_name,phone,approved,notify_email,notify_sms");

      if (audience === "approved_members") {
        membersQuery = membersQuery.eq("approved", true);
      }

      const { data: members, error: membersError } = await membersQuery;

      if (membersError) {
        if (membersError.code === "42P01") {
          return json(
            {
              error:
                "Member notifications are not configured yet. Run member_notifications.sql first.",
            },
            503,
            origin,
          );
        }
        throw membersError;
      }

      const audienceMembers = (members || []) as MemberProfile[];
      const deliveryResults: DeliveryResult[] = [];

      for (const member of audienceMembers) {
        const recipientName = buildMemberName(member);
        const emailMessage = `Hi ${recipientName},\n\n${message}\n`;

        if (channels.includes("email")) {
          if (!member.notify_email) {
            deliveryResults.push({
              user_id: member.user_id,
              channel: "email",
              delivery_target: member.email,
              status: "skipped",
              reason: "member_disabled_email",
            });
          } else if (dryRun) {
            deliveryResults.push({
              user_id: member.user_id,
              channel: "email",
              delivery_target: member.email,
              status: "skipped",
              reason: "dry_run",
            });
          } else {
            const result = await sendEmail({
              to: member.email,
              subject,
              message: emailMessage,
            });
            deliveryResults.push({
              user_id: member.user_id,
              channel: "email",
              delivery_target: member.email,
              status: result.ok ? "sent" : "failed",
              id: result.id ?? null,
              error: result.error,
              reason: result.skipped ? "provider_not_configured" : undefined,
            });
          }
        }

        if (channels.includes("sms")) {
          if (!member.notify_sms) {
            deliveryResults.push({
              user_id: member.user_id,
              channel: "sms",
              delivery_target: member.phone || "",
              status: "skipped",
              reason: "member_disabled_sms",
            });
          } else if (!member.phone) {
            deliveryResults.push({
              user_id: member.user_id,
              channel: "sms",
              delivery_target: "",
              status: "skipped",
              reason: "missing_phone",
            });
          } else if (dryRun) {
            deliveryResults.push({
              user_id: member.user_id,
              channel: "sms",
              delivery_target: member.phone,
              status: "skipped",
              reason: "dry_run",
            });
          } else {
            const result = await sendSms({
              to: member.phone,
              message: `${subject}\n\n${message}`,
            });
            deliveryResults.push({
              user_id: member.user_id,
              channel: "sms",
              delivery_target: member.phone,
              status: result.ok ? "sent" : "failed",
              id: result.id ?? null,
              error: result.error,
              reason: result.skipped ? "provider_not_configured" : undefined,
            });
          }
        }
      }

      const successCount = deliveryResults.filter((item) => item.status === "sent").length;
      const errorCount = deliveryResults.filter((item) => item.status === "failed").length;
      const skippedCount = deliveryResults.filter((item) => item.status === "skipped").length;
      const errorSummary = [
        ...new Set(
          deliveryResults
            .filter((item) => item.status === "failed" && item.error)
            .map((item) => item.error as string),
        ),
      ];
      const nextStatus = dryRun
        ? "draft"
        : errorCount > 0 && successCount > 0
          ? "partial"
          : errorCount > 0
            ? "failed"
            : "sent";

      await supabase
        .from("member_broadcasts")
        .update({
          status: nextStatus,
          sent_at: dryRun ? null : new Date().toISOString(),
        })
        .eq("id", broadcast.id);

      if (!dryRun && deliveryResults.length) {
        const rows = deliveryResults.map((item) => ({
          broadcast_id: broadcast.id,
          user_id: item.user_id,
          channel: item.channel,
          delivery_target: item.delivery_target,
          status: item.status,
          provider_message_id: item.id ?? null,
          error_message: item.error ?? item.reason ?? null,
          delivered_at: item.status === "sent" ? new Date().toISOString() : null,
        }));

        const { error: deliveryError } = await supabase
          .from("member_broadcast_deliveries")
          .insert(rows);
        if (deliveryError) {
          throw deliveryError;
        }
      }

      return json(
        {
          broadcast,
          recipients: audienceMembers.length,
          deliveries: deliveryResults.length,
          successful_deliveries: successCount,
          failed_deliveries: errorCount,
          skipped_deliveries: skippedCount,
          dry_run: dryRun,
          email_provider: getEmailProviderName(),
          sms_provider: getSmsProviderName(),
          error_summary: errorSummary,
          note: "This function is ready for the portal admin tab after you deploy it and set the provider secrets.",
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
      console.log("member-broadcast function ready");
    },
  },
);
