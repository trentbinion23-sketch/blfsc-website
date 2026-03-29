"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <main className="page-shell section-space">
          <section className="card-surface space-y-5 p-8">
            <p className="eyebrow">Something went wrong</p>
            <h1 className="text-4xl leading-none">We hit an unexpected error.</h1>
            <p className="text-base leading-7 text-white/75">
              The issue has been logged. Please try reloading the page.
            </p>
            <button type="button" className="btn-primary" onClick={() => reset()}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
