import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.10.1";
import { applyRateLimit, getClientIp } from "../_shared/security.ts";

type OrderNotifyRequest = {
  order_id?: number;
};

type OrderRow = {
  id: number;
  user_id: string;
  status: string;
  items: Record<string, unknown> | null;
  created_at: string;
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

let smtpTransport: nodemailer.Transporter | null = null;

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

function parseNotifyAdminEmails() {
  const raw = Deno.env.get("ORDER_NOTIFY_TO_EMAIL") || "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

function moneyAud(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
}

function buildOrderEmail(order: OrderRow, portalHint: string) {
  const items = (order.items && typeof order.items === "object" ? order.items : {}) as Record<
    string,
    unknown
  >;
  const customerName = String(items.customer_name || "Member").trim();
  const lineItems = Array.isArray(items.line_items) ? items.line_items : [];
  const lines = lineItems
    .map((row: unknown) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const qty = Number(r.qty || 1);
      const name = String(r.name || "Item");
      const size = r.size ? ` (${String(r.size)})` : "";
      const price = Number(r.price || 0);
      return `  - ${qty}× ${name}${size} @ ${moneyAud(price)} each`;
    })
    .filter(Boolean)
    .join("\n");

  const totalRaw = items.total;
  const total =
    totalRaw != null && !Number.isNaN(Number(totalRaw)) ? moneyAud(Number(totalRaw)) : "—";
  const state = items.state ? String(items.state) : "";
  const notes = items.notes ? String(items.notes) : "";

  const text = [
    `Hi ${customerName},`,
    ``,
    `Thanks — we've received BLFSC merch order #${order.id}.`,
    ``,
    `Status: ${order.status}`,
    `Total (at submit): ${total}`,
    state ? `State/region: ${state}` : "",
    notes ? `Your notes: ${notes}` : "",
    ``,
    `Items:`,
    lines || "  (see portal for details)",
    ``,
    `View or track this in the members portal: ${portalHint}`,
    ``,
    `— BLFSC`,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const subject = `BLFSC order #${order.id} received`;
  return { subject, text };
}

async function sendOrderEmail(input: { to: string; bcc: string[]; subject: string; text: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("BROADCAST_FROM_EMAIL");

  if (apiKey && from) {
    const body: Record<string, unknown> = {
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    };
    if (input.bcc.length) {
      body.bcc = input.bcc;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return response.ok
      ? { ok: true as const, id: data.id ?? null, provider: "resend" }
      : {
          ok: false as const,
          error: data?.message || "Resend rejected the request",
          provider: "resend",
        };
  }

  const transporter = getSmtpTransport();
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || Deno.env.get("BROADCAST_FROM_EMAIL");
  const fromName = Deno.env.get("SMTP_FROM_NAME") || "BLFSC";

  if (!transporter || !fromEmail) {
    return {
      ok: false as const,
      skipped: true as const,
      error: "Email provider not configured (set RESEND_API_KEY + BROADCAST_FROM_EMAIL or SMTP).",
      provider: "none",
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
      to: input.to,
      bcc: input.bcc.length ? input.bcc.join(", ") : undefined,
      subject: input.subject,
      text: input.text,
    });

    return {
      ok: true as const,
      id: info.messageId ?? null,
      provider: "smtp",
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "SMTP send failed",
      provider: "smtp",
    };
  }
}

Deno.serve(async (req) => {
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

    const { data: profileRow, error: profileError } = await userClient
      .from("member_profiles")
      .select("user_id,approved")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      if (profileError.code === "42P01") {
        return json(
          { error: "Member profiles are not configured. Run member_notifications.sql." },
          503,
          origin,
        );
      }
      throw profileError;
    }

    const approved =
      profileRow?.approved === true || (profileRow as { approved?: unknown })?.approved === "t";
    if (!approved) {
      return json(
        { error: "Approved member access is required to confirm orders by email." },
        403,
        origin,
      );
    }

    const clientIp = getClientIp(req);
    let rateLimit = { allowed: true, retryAfterSeconds: 0 };
    try {
      rateLimit = await applyRateLimit({
        key: `order-notify:${user.id}:${clientIp}`,
        maxRequests: 24,
        windowMs: 3_600_000,
        supabaseUrl,
        serviceRoleKey,
      });
    } catch (e) {
      console.error(
        "order-notify: consume_edge_rate_limit unavailable; skipping rate limit",
        e instanceof Error ? e.message : e,
      );
    }

    if (!rateLimit.allowed) {
      return json(
        { error: `Too many requests. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
        429,
        origin,
      );
    }

    const body = (await req.json()) as OrderNotifyRequest;
    const orderId = Number(body.order_id);
    if (!Number.isFinite(orderId) || orderId < 1) {
      return json({ error: "order_id is required and must be a positive number." }, 400, origin);
    }

    const { data: order, error: orderError } = await userClient
      .from("orders")
      .select("id,user_id,status,items,created_at")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return json({ error: "Order not found or access denied." }, 404, origin);
    }

    const row = order as OrderRow;
    if (row.user_id !== user.id) {
      return json({ error: "Order not found or access denied." }, 404, origin);
    }

    const items = (row.items && typeof row.items === "object" ? row.items : {}) as Record<
      string,
      unknown
    >;
    const memberEmail = String(items.member_email || user.email || "").trim();
    if (!memberEmail) {
      return json({ error: "No email address available for this order." }, 400, origin);
    }

    const portalBase =
      Deno.env.get("PUBLIC_PORTAL_URL") ||
      Deno.env.get("NEXT_PUBLIC_SITE_URL") ||
      "https://blfsc.com/portal";
    const portalHint = portalBase.includes("/portal")
      ? portalBase
      : `${portalBase.replace(/\/$/, "")}/portal`;

    const { subject, text } = buildOrderEmail(row, portalHint);
    const adminBcc = parseNotifyAdminEmails();

    const result = await sendOrderEmail({
      to: memberEmail,
      bcc: adminBcc,
      subject,
      text,
    });

    if (result.ok) {
      return json({
        sent: true,
        provider: result.provider,
        id: result.id,
        to: memberEmail,
        bcc: adminBcc.length ? adminBcc : undefined,
      });
    }

    if ("skipped" in result && result.skipped) {
      return json(
        {
          sent: false,
          skipped: true,
          message: result.error,
        },
        200,
        origin,
      );
    }

    return json(
      {
        sent: false,
        error: "error" in result ? result.error : "Email send failed",
        provider: "provider" in result ? result.provider : "unknown",
      },
      502,
      origin,
    );
  } catch (error) {
    console.error("order-notify:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500,
      origin,
    );
  }
});
