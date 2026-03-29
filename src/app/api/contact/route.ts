import { NextResponse } from "next/server";
import { Resend } from "resend";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

type ContactRequest = {
  name?: string;
  email?: string;
  subject?: string;
  topic?: string;
  message?: string;
  turnstileToken?: string;
};

type ContactMessage = {
  name: string;
  email: string;
  subject: string;
  topic: string;
  message: string;
};

function getClientIp(req: Request) {
  const cloudflareIp = req.headers.get("cf-connecting-ip");
  if (cloudflareIp) return cloudflareIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = req.headers.get("x-forwarded-for")?.trim();
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendContactEmail(input: ContactMessage) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  const from = process.env.CONTACT_FROM_EMAIL?.trim();
  if (!apiKey || !to || !from) {
    return {
      sent: false,
      skipped: true,
    };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [to],
    replyTo: input.email,
    subject: `[BLFSC Contact] ${input.subject}`,
    text: `Name: ${input.name}\nEmail: ${input.email}\nTopic: ${input.topic}\n\n${input.message}`,
  });

  return {
    sent: !error,
    skipped: false,
  };
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rateLimit = await consumeRateLimit({
    key: `contact:${ip}`,
    maxRequests: 8,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many messages in a short time. Please wait and try again.",
      },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as ContactRequest;
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const subject = String(body.subject || "").trim();
  const topic = String(body.topic || "").trim();
  const message = String(body.message || "").trim();
  const turnstileToken = String(body.turnstileToken || "").trim();

  if (!name || !email || !subject || !topic || message.length < 20 || !isEmail(email)) {
    return NextResponse.json(
      {
        success: false,
        error: "Please provide a valid name, email, topic, subject, and message.",
      },
      { status: 400 },
    );
  }

  const challenge = await verifyTurnstile({
    token: turnstileToken,
    action: "contact_form",
    remoteIp: ip,
  });
  if (!challenge.ok) {
    return NextResponse.json(
      {
        success: false,
        error: challenge.message || "Challenge verification failed. Please try again.",
      },
      { status: 400 },
    );
  }

  const delivery = await sendContactEmail({
    name,
    email,
    subject,
    topic,
    message,
  });

  return NextResponse.json({
    success: true,
    sent: delivery.sent,
    skipped: delivery.skipped,
  });
}
