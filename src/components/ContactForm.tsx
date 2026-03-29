"use client";

import { useMemo, useState } from "react";
import Script from "next/script";

type ContactFormProps = {
  contactEmail: string;
};

type ContactFormState = {
  name: string;
  email: string;
  subject: string;
  topic: string;
  message: string;
};

const defaultState: ContactFormState = {
  name: "",
  email: "",
  subject: "",
  topic: "",
  message: "",
};

const topicOptions = [
  "General enquiry",
  "Rides and events",
  "Member access",
  "Merch",
  "Community or media",
];
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

declare global {
  interface Window {
    turnstile?: {
      reset: () => void;
    };
  }
}

export function ContactForm({ contactEmail }: ContactFormProps) {
  const [values, setValues] = useState<ContactFormState>(defaultState);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  function validate(next: ContactFormState) {
    const nextErrors: Partial<Record<keyof ContactFormState, string>> = {};

    if (!next.name.trim()) nextErrors.name = "Please enter your name.";
    if (!next.email.trim()) nextErrors.email = "Please enter your email.";
    if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!next.subject.trim()) nextErrors.subject = "Please add a subject.";
    if (!next.topic.trim()) nextErrors.topic = "Please choose a topic.";
    if (!next.message.trim()) nextErrors.message = "Please write your message.";
    if (next.message.trim() && next.message.trim().length < 20) {
      nextErrors.message = "Please add a little more detail so we can help.";
    }

    return nextErrors;
  }

  function handleChange(field: keyof ContactFormState, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    setErrors(validate(next));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitError("");

    if (Object.keys(nextErrors).length > 0) {
      setSubmitted(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const turnstileToken = String(formData.get("cf-turnstile-response") || "").trim();

    setSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          ...(turnstileSiteKey ? { turnstileToken } : {}),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Could not send your message.");
      }
      setSubmitted(true);
      setValues(defaultState);
      setErrors({});
      window.turnstile?.reset();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="card-surface p-8">
        <p className="eyebrow">Message sent</p>
        <h3 className="mt-4 text-3xl leading-none">Thanks, your enquiry has been received.</h3>
        <p className="mt-4 max-w-xl text-base leading-7">
          If you need to add anything, email us directly at{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="font-semibold text-white hover:text-[var(--sand)]"
          >
            {contactEmail}
          </a>{" "}
          and we will get back to you as soon as we can.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn-primary" onClick={() => setSubmitted(false)}>
            Send another message
          </button>
          <a href={`mailto:${contactEmail}`} className="btn-secondary">
            Email BLFSC directly
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="card-surface space-y-5 p-6 sm:p-8" onSubmit={handleSubmit} noValidate>
      {turnstileSiteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
          <div
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
            data-action="contact_form"
          />
        </>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="field-label">
            Name
          </label>
          <input
            id="name"
            name="name"
            className="input-field"
            value={values.name}
            onChange={(event) => handleChange("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name ? (
            <p id="name-error" className="mt-2 text-sm text-[var(--rust)]">
              {errors.name}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="email" className="field-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input-field"
            value={values.email}
            onChange={(event) => handleChange("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <p id="email-error" className="mt-2 text-sm text-[var(--rust)]">
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_0.7fr]">
        <div>
          <label htmlFor="subject" className="field-label">
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            className="input-field"
            value={values.subject}
            onChange={(event) => handleChange("subject", event.target.value)}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? "subject-error" : undefined}
          />
          {errors.subject ? (
            <p id="subject-error" className="mt-2 text-sm text-[var(--rust)]">
              {errors.subject}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="topic" className="field-label">
            Topic
          </label>
          <select
            id="topic"
            name="topic"
            className="input-field"
            value={values.topic}
            onChange={(event) => handleChange("topic", event.target.value)}
            aria-invalid={Boolean(errors.topic)}
            aria-describedby={errors.topic ? "topic-error" : undefined}
          >
            <option value="">Choose a topic</option>
            {topicOptions.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
          {errors.topic ? (
            <p id="topic-error" className="mt-2 text-sm text-[var(--rust)]">
              {errors.topic}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="field-label">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          className="input-field min-h-40 resize-y"
          value={values.message}
          onChange={(event) => handleChange("message", event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message ? (
          <p id="message-error" className="mt-2 text-sm text-[var(--rust)]">
            {errors.message}
          </p>
        ) : null}
      </div>

      {hasErrors ? (
        <p className="rounded-2xl border border-[var(--rust)]/15 bg-[rgba(155,52,31,0.06)] px-4 py-3 text-sm font-semibold text-[var(--rust)]">
          Check the highlighted fields and try again.
        </p>
      ) : null}

      {submitError ? (
        <p className="rounded-2xl border border-[var(--rust)]/15 bg-[rgba(155,52,31,0.06)] px-4 py-3 text-sm font-semibold text-[var(--rust)]">
          {submitError}
        </p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={sending}>
        {sending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
