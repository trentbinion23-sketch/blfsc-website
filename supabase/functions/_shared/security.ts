type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function getClientIp(req: Request) {
  const cloudflareIp = req.headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}

export async function applyRateLimit(input: {
  key: string;
  maxRequests: number;
  windowMs: number;
  supabaseUrl: string;
  serviceRoleKey: string;
}): Promise<RateLimitResult> {
  const response = await fetch(`${input.supabaseUrl}/rest/v1/rpc/consume_edge_rate_limit`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.serviceRoleKey}`,
      apikey: input.serviceRoleKey,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify({
      p_key: input.key,
      p_window_ms: input.windowMs,
      p_max_requests: input.maxRequests,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Rate limit RPC failed: ${response.status} ${message}`);
  }

  const payload = await response.json().catch(() => ({}));
  const row = Array.isArray(payload) ? payload[0] : payload;

  return {
    allowed: Boolean(row?.allowed),
    retryAfterSeconds: Number(row?.retry_after_seconds || 0),
  };
}

type TurnstileVerification = {
  ok: boolean;
  skipped: boolean;
  message?: string;
};

type TurnstileResponse = {
  success?: boolean;
  "error-codes"?: string[];
  action?: string;
};

export async function verifyTurnstileToken(input: {
  token?: string;
  action: string;
  req: Request;
}): Promise<TurnstileVerification> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return {
      ok: true,
      skipped: true,
    };
  }

  const token = String(input.token || "").trim();
  if (!token) {
    return {
      ok: false,
      skipped: false,
      message: "Missing Turnstile token.",
    };
  }

  const ip = getClientIp(input.req);
  const payload = new URLSearchParams({
    secret,
    response: token,
    remoteip: ip,
  });

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });

  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      message: "Could not verify Turnstile challenge.",
    };
  }

  const body = (await response.json().catch(() => ({}))) as TurnstileResponse;
  const actionMatched = !body.action || body.action === input.action;
  if (body.success && actionMatched) {
    return {
      ok: true,
      skipped: false,
    };
  }

  const firstError = body["error-codes"]?.[0];
  return {
    ok: false,
    skipped: false,
    message: firstError
      ? `Turnstile rejected request: ${firstError}`
      : "Turnstile rejected request.",
  };
}
