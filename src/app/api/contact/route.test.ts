import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const { sendEmailMock, resendConstructorMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  resendConstructorMock: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  consumeRateLimit: vi.fn(),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmailMock };
    constructor(apiKey: string) {
      resendConstructorMock(apiKey);
    }
  },
}));

const mockedConsumeRateLimit = vi.mocked(consumeRateLimit);

const originalEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
  CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
};

function createRequest(body?: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedConsumeRateLimit.mockReset();
    resendConstructorMock.mockReset();
    sendEmailMock.mockReset();
    mockedConsumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterMs: 0,
    });
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_TO_EMAIL;
    delete process.env.CONTACT_FROM_EMAIL;
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    process.env.CONTACT_TO_EMAIL = originalEnv.CONTACT_TO_EMAIL;
    process.env.CONTACT_FROM_EMAIL = originalEnv.CONTACT_FROM_EMAIL;
    vi.clearAllMocks();
  });

  it("rejects invalid input", async () => {
    const response = await POST(
      createRequest({
        name: "Test User",
        email: "not-an-email",
        subject: "",
        topic: "General",
        message: "Too short",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Please provide a valid name, email, topic, subject, and message.",
    });
  });

  it("returns 429 when the request exceeds the rate limit", async () => {
    mockedConsumeRateLimit.mockResolvedValueOnce({
      allowed: false,
      retryAfterMs: 30_000,
    });

    const response = await POST(
      createRequest({
        name: "Test User",
        email: "member@example.com",
        subject: "Question",
        topic: "Membership",
        message: "This message is definitely long enough to be accepted.",
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Too many messages in a short time. Please wait and try again.",
    });
  });

  it("returns success with skipped delivery when email env vars are missing", async () => {
    const response = await POST(
      createRequest({
        name: "Test User",
        email: "member@example.com",
        subject: "Question",
        topic: "Membership",
        message: "This message is definitely long enough to be accepted.",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sent: false,
      skipped: true,
    });
  });

  it("sends the contact email when email env vars are configured", async () => {
    process.env.RESEND_API_KEY = "resend-key";
    process.env.CONTACT_TO_EMAIL = "contact@blfsc.com";
    process.env.CONTACT_FROM_EMAIL = "noreply@blfsc.com";
    sendEmailMock.mockResolvedValueOnce({
      data: { id: "email-123" },
      error: null,
    });

    const response = await POST(
      createRequest(
        {
          name: "Test User",
          email: "member@example.com",
          subject: "Question",
          topic: "Membership",
          message: "This message is definitely long enough to be accepted.",
        },
        { "cf-connecting-ip": "198.51.100.4" },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      sent: true,
      skipped: false,
    });
    expect(resendConstructorMock).toHaveBeenCalledWith("resend-key");
    expect(sendEmailMock).toHaveBeenCalledWith({
      from: "noreply@blfsc.com",
      to: ["contact@blfsc.com"],
      replyTo: "member@example.com",
      subject: "[BLFSC Contact] Question",
      text: "Name: Test User\nEmail: member@example.com\nTopic: Membership\n\nThis message is definitely long enough to be accepted.",
    });
  });
});
