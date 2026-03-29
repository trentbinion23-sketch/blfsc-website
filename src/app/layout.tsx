import type { Metadata } from "next";
import Link from "next/link";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileConversionBar } from "@/components/MobileConversionBar";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { buildMetadata } from "@/lib/seo";
import { getPublicSiteContent } from "@/lib/site-content";
import "./globals.css";

const bodyFont = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const displayFont = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = buildMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteContent = await getPublicSiteContent();

  return (
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AnalyticsProvider />
        <ServiceWorkerRegistration />
        <div className="flex min-h-screen flex-col">
          {siteContent.announcement.enabled ? (
            <div className="border-b border-[rgba(208,162,66,0.18)] bg-[linear-gradient(90deg,rgba(45,109,246,0.18),rgba(4,9,20,0.94),rgba(207,61,52,0.18))]">
              <div className="page-shell flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="eyebrow text-[var(--sand)]">{siteContent.announcement.title}</p>
                  <p className="text-sm leading-6 text-white/82 sm:text-base">
                    {siteContent.announcement.message}
                  </p>
                </div>
                <Link
                  href={siteContent.announcement.linkHref}
                  className="btn-secondary w-full justify-center sm:w-auto"
                >
                  {siteContent.announcement.linkLabel}
                </Link>
              </div>
            </div>
          ) : null}
          <Header />
          <main className="flex-1">{children}</main>
          <Footer content={siteContent} />
        </div>
        <MobileConversionBar />
      </body>
    </html>
  );
}
