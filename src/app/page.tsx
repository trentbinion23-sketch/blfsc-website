import Image from "next/image";
import Link from "next/link";
import { CTASection } from "@/components/CTASection";
import { EmptyState } from "@/components/EmptyState";
import { EventCard } from "@/components/EventCard";
import { FeatureFlagHomeCta } from "@/components/FeatureFlagHomeCta";
import { Hero } from "@/components/Hero";
import { PortalPromo } from "@/components/PortalPromo";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeading } from "@/components/SectionHeading";
import { getPublicProducts } from "@/lib/public-products";
import { siteAssets } from "@/lib/site-config";
import { getPublicSiteContent } from "@/lib/site-content";

export default async function Home() {
  const [siteContent, products] = await Promise.all([getPublicSiteContent(), getPublicProducts()]);
  const featuredEvents = siteContent.events.filter((event) => event.featured).slice(0, 3);
  const visibleEvents = featuredEvents.length ? featuredEvents : siteContent.events.slice(0, 3);
  const featuredProducts = products.slice(0, 4);

  return (
    <>
      <Hero
        eyebrow="B.L.F. Social Club"
        title={siteContent.hero.title}
        description={siteContent.hero.description}
        actions={[
          {
            href: "/events",
            label: "See what's on",
            trackEvent: "cta_events_click",
            trackLocation: "home_hero",
          },
          {
            href: "/portal",
            label: "Member sign-in",
            variant: "secondary",
            trackEvent: "cta_portal_click",
            trackLocation: "home_hero",
          },
        ]}
        aside={
          <div className="flex h-full flex-col gap-6">
            <div className="rounded-[24px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(45,109,246,0.07))] p-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[var(--line)] bg-black/20">
                  <Image
                    src={siteAssets.logo}
                    alt="BLFSC club logo"
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="relative h-8 w-[128px]">
                    <Image
                      src={siteAssets.wordmark}
                      alt="BLFSC wordmark"
                      fill
                      sizes="128px"
                      className="object-contain object-left"
                    />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Motorcycle social club. Adelaide rides, club nights, member access.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--line)] bg-white/6 p-5">
              <p className="eyebrow text-[var(--sand)]">Next ride</p>
              <h2 className="mt-3 text-3xl leading-none">{siteContent.hero.noticeTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-white/74">{siteContent.hero.noticeCopy}</p>
            </div>

            <div className="relative min-h-64 flex-1 overflow-hidden rounded-[24px] border border-[var(--line)]">
              <Image
                src={siteAssets.stormVisual}
                alt="BLFSC visual panel"
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover opacity-78"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>

            {siteContent.home.signalChips.length ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {siteContent.home.signalChips.map((item) => (
                  <div
                    key={item}
                    className="rounded-[20px] border border-[var(--line)] bg-white/6 px-4 py-4 text-center text-sm font-semibold text-white/82"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        }
      />

      {siteContent.home.quickLinks.length ? (
        <section className="page-shell pb-10">
          <div className="grid gap-5 md:grid-cols-3">
            {siteContent.home.quickLinks.map((item) => (
              <article key={item.label} className="card-surface interactive-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(45,109,246,0.18)] text-sm font-bold text-[var(--sand)]">
                    {item.marker}
                  </span>
                  <h2 className="text-2xl leading-none sm:text-3xl">{item.label}</h2>
                </div>
                <p className="mt-4 text-base leading-7">{item.copy}</p>
                <Link
                  href={item.href}
                  className="btn-text mt-4"
                  data-track-event="quick_link_click"
                  data-track-location="home_quick_links"
                  data-track-label={item.label}
                >
                  {item.cta}
                  <span aria-hidden="true">-&gt;</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-shell pb-4">
        <FeatureFlagHomeCta />
      </section>

      <section className="page-shell section-space">
        <SectionHeading
          eyebrow={siteContent.home.eventsHeading.eyebrow}
          title={siteContent.home.eventsHeading.title}
          description={siteContent.home.eventsHeading.description}
        />
        <div className="mt-10">
          {visibleEvents.length ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No rides or club nights are published yet."
              description="Add events in the admin website editor and they will show up here."
            />
          )}
        </div>
      </section>

      <section className="page-shell section-space">
        <div className="grid gap-8 lg:grid-cols-[0.96fr_1.04fr] lg:items-center">
          <div className="space-y-5">
            <SectionHeading
              eyebrow={siteContent.home.aboutHeading.eyebrow}
              title={siteContent.story.title}
              description={siteContent.home.aboutHeading.description}
            />
            <p className="max-w-2xl text-base leading-7">{siteContent.story.paragraphOne}</p>
            <p className="max-w-2xl text-base leading-7">{siteContent.story.paragraphTwo}</p>
            <Link
              href="/about"
              className="btn-primary"
              data-track-event="cta_about_click"
              data-track-location="home_about_section"
              data-track-label={siteContent.home.aboutCtaLabel}
            >
              {siteContent.home.aboutCtaLabel}
            </Link>
          </div>
          <div className="card-surface overflow-hidden">
            <div className="relative aspect-[5/4] bg-[linear-gradient(180deg,rgba(4,9,20,0.82),rgba(5,12,22,0.96))]">
              <Image
                src={siteAssets.stormVisual}
                alt="BLFSC storm artwork"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover opacity-65"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(4,9,20,0.72))]" />
              <div className="absolute inset-x-8 bottom-8 top-8">
                <div className="relative h-full w-full">
                  <Image
                    src={siteAssets.rhinoMark}
                    alt="BLFSC mark"
                    fill
                    sizes="(min-width: 1024px) 30vw, 90vw"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell section-space">
        <SectionHeading
          eyebrow={siteContent.home.merchHeading.eyebrow}
          title={siteContent.home.merchHeading.title}
          description={siteContent.home.merchHeading.description}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-stretch">
          <div className="card-surface p-7 sm:p-8">
            {siteContent.home.merchCategories.length ? (
              <div className="flex flex-wrap gap-3">
                {siteContent.home.merchCategories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-[var(--line)] bg-white/6 px-4 py-2 text-sm font-semibold text-white/85"
                  >
                    {category}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-6 max-w-2xl text-base leading-7">{siteContent.home.merchLead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/merch"
                className="btn-primary"
                data-track-event="cta_merch_click"
                data-track-location="home_merch_section"
                data-track-label={siteContent.home.merchPrimaryLabel}
              >
                {siteContent.home.merchPrimaryLabel}
              </Link>
              <Link
                href="/portal"
                className="btn-secondary"
                data-track-event="cta_portal_click"
                data-track-location="home_merch_section"
                data-track-label={siteContent.home.merchSecondaryLabel}
              >
                {siteContent.home.merchSecondaryLabel}
              </Link>
            </div>
          </div>
          <div className="card-surface overflow-hidden">
            <div className="grid h-full gap-4 p-6 sm:p-7">
              <div className="rounded-[22px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(45,109,246,0.18),rgba(207,61,52,0.1))] p-5">
                <p className="eyebrow text-[var(--sand)]">{siteContent.home.merchFeatureEyebrow}</p>
                <h3 className="mt-3 text-3xl leading-none">{siteContent.home.merchFeatureTitle}</h3>
              </div>
              <div className="rounded-[22px] border border-[var(--line)] bg-white/6 p-5 text-sm leading-7 text-white/75">
                {siteContent.home.merchFeatureCopy}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-10">
          {featuredProducts.length ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No merch is live on the public site yet."
              description="Use the admin merch manager to publish items and they will appear here automatically."
            />
          )}
        </div>
      </section>

      {siteContent.home.pillars.length ? (
        <section className="page-shell section-space">
          <SectionHeading
            eyebrow={siteContent.home.pillarsHeading.eyebrow}
            title={siteContent.home.pillarsHeading.title}
            description={siteContent.home.pillarsHeading.description}
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {siteContent.home.pillars.map((pillar) => (
              <article key={pillar.title} className="card-surface interactive-card p-7 sm:p-8">
                <p className="eyebrow">{pillar.eyebrow}</p>
                <h3 className="mt-4 text-2xl leading-none sm:text-3xl">{pillar.title}</h3>
                <p className="mt-4 text-base leading-7">{pillar.copy}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <PortalPromo />

      <CTASection
        eyebrow={siteContent.home.contactHeading.eyebrow}
        title={siteContent.home.contactHeading.title}
        description={siteContent.home.contactHeading.description}
        actions={[
          {
            href: "/contact",
            label: "Contact the club",
            trackEvent: "cta_contact_click",
            trackLocation: "home_footer_cta",
          },
          {
            href: "/events",
            label: "See events",
            variant: "secondary",
            trackEvent: "cta_events_click",
            trackLocation: "home_footer_cta",
          },
        ]}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={siteContent.contact.instagramUrl}
            className="rounded-[18px] border border-white/10 bg-white/6 px-4 py-4 text-sm font-semibold text-white/78 transition hover:border-[var(--sand)] hover:text-white"
          >
            Instagram
          </a>
          <a
            href={siteContent.contact.facebookUrl}
            className="rounded-[18px] border border-white/10 bg-white/6 px-4 py-4 text-sm font-semibold text-white/78 transition hover:border-[var(--sand)] hover:text-white"
          >
            Facebook
          </a>
          <a
            href={siteContent.contact.tiktokUrl}
            className="rounded-[18px] border border-white/10 bg-white/6 px-4 py-4 text-sm font-semibold text-white/78 transition hover:border-[var(--sand)] hover:text-white"
          >
            TikTok
          </a>
          <a
            href={`mailto:${siteContent.contact.email}`}
            className="rounded-[18px] border border-white/10 bg-white/6 px-4 py-4 text-sm font-semibold text-white/78 transition hover:border-[var(--sand)] hover:text-white"
          >
            {siteContent.contact.email}
          </a>
        </div>
      </CTASection>
    </>
  );
}
