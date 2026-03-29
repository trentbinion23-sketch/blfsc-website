import Link from "next/link";
import type { SiteContent } from "@/lib/site-content";
import { footerNavItems } from "@/lib/site-routes";

type FooterProps = {
  content: SiteContent;
};

export function Footer({ content }: FooterProps) {
  const socialLinks = [
    { label: "Instagram", href: content.contact.instagramUrl },
    { label: "Facebook", href: content.contact.facebookUrl },
    { label: "TikTok", href: content.contact.tiktokUrl },
  ];

  return (
    <footer className="border-t border-[var(--line)] bg-[rgba(4,9,20,0.94)]">
      <div className="page-shell grid gap-10 py-12 lg:grid-cols-[1.1fr_1fr_0.8fr]">
        <div className="space-y-4">
          <p className="eyebrow">BLFSC</p>
          <h2 className="text-4xl leading-none">{content.footer.title}</h2>
          <p className="max-w-md text-base leading-7">{content.footer.copy}</p>
        </div>

        <div>
          <h3 className="text-2xl leading-none">Site links</h3>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {footerNavItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sand)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-2xl leading-none">Social</h3>
          <ul className="mt-5 space-y-3">
            {socialLinks.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--sand)]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">{content.footer.note}</p>
          <p className="mt-3 text-sm">
            {content.contact.email}
            <br />
            {content.contact.phone}
          </p>
        </div>
      </div>
    </footer>
  );
}
