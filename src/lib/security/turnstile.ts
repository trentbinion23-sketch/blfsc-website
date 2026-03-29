type TurnstileResult = {
  success?: boolean;
  action?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(input: {
  token?: string;
  action: string;
  remoteIp?: string;
}) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return {
      ok: true,
      skipped: true,
      message: "",
    };
  }

  const token = String(input.token || "").trim();
  if (!token) {
    return {
      ok: false,
      skipped: false,
      message: "Missing verification challenge token.",
    };
  }

  const payload = new URLSearchParams({
    secret,
    response: token,
  });
  if (input.remoteIp) {
    payload.set("remoteip", input.remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: payload,
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      skipped: false,
      message: "Could not verify the challenge. Please try again.",
    };
  }

  const data = (await response.json().catch(() => ({}))) as TurnstileResult;
  const actionMatched = !data.action || data.action === input.action;
  if (data.success && actionMatched) {
    return {
      ok: true,
      skipped: false,
      message: "",
    };
  }

  return {
    ok: false,
    skipped: false,
    message: data["error-codes"]?.[0]
      ? `Verification rejected: ${data["error-codes"][0]}`
      : "Verification rejected. Please try again.",
  };
}
