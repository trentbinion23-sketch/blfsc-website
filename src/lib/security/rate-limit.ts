type Bucket = number[];

const buckets = new Map<string, Bucket>();

type RateLimitInput = { key: string; maxRequests: number; windowMs: number };

type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

function consumeLocalRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now();
  const cutoff = now - input.windowMs;
  const existing = buckets.get(input.key) || [];
  const recent = existing.filter((value) => value > cutoff);

  if (recent.length >= input.maxRequests) {
    const retryAt = (recent[0] || now) + input.windowMs;
    return {
      allowed: false,
      retryAfterMs: Math.max(0, retryAt - now),
    };
  }

  recent.push(now);
  buckets.set(input.key, recent);
  return {
    allowed: true,
    retryAfterMs: 0,
  };
}

async function consumeSharedRateLimit(input: RateLimitInput): Promise<RateLimitResult | null> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_edge_rate_limit`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify({
      p_key: input.key,
      p_window_ms: input.windowMs,
      p_max_requests: input.maxRequests,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Shared rate limit RPC failed with status ${response.status}.`);
  }

  const payload = (await response.json().catch(() => ({}))) as
    | { allowed?: boolean; retry_after_seconds?: number }
    | Array<{ allowed?: boolean; retry_after_seconds?: number }>;
  const row = Array.isArray(payload) ? payload[0] : payload;
  return {
    allowed: Boolean(row?.allowed),
    retryAfterMs: Math.max(0, Number(row?.retry_after_seconds || 0) * 1000),
  };
}

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  try {
    const sharedResult = await consumeSharedRateLimit(input);
    if (sharedResult) return sharedResult;
  } catch {
    // Fall back to local buckets if shared RPC is unavailable.
  }

  return consumeLocalRateLimit(input);
}
