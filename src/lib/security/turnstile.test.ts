import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

const originalSecret = process.env.TURNSTILE_SECRET_KEY;

describe("verifyTurnstile", () => {
  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
    vi.restoreAllMocks();
  });

  it("skips verification when no secret key is set", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;

    const result = await verifyTurnstile({
      token: "ignored",
      action: "contact_form",
      remoteIp: "127.0.0.1",
    });

    expect(result).toEqual({
      ok: true,
      skipped: true,
      message: "",
    });
  });

  it("rejects missing token when secret is set", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-key";

    const result = await verifyTurnstile({
      token: "",
      action: "contact_form",
      remoteIp: "127.0.0.1",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Missing verification challenge token");
  });

  it("accepts valid response with matching action", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: "contact_form",
        }),
        { status: 200 },
      ),
    );

    const result = await verifyTurnstile({
      token: "token",
      action: "contact_form",
      remoteIp: "127.0.0.1",
    });

    expect(result).toEqual({
      ok: true,
      skipped: false,
      message: "",
    });
  });

  it("rejects valid response when action does not match", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: "wrong_action",
        }),
        { status: 200 },
      ),
    );

    const result = await verifyTurnstile({
      token: "token",
      action: "contact_form",
      remoteIp: "127.0.0.1",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Verification rejected");
  });
});
