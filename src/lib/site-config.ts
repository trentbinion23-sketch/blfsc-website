const fallbackPublicSiteUrl = "https://blfsc.com";
const fallbackSupabaseUrl = "https://example.invalid";
const fallbackSupabaseAnonKey = "missing-public-anon-key";
const fallbackPortalOwnerEmail = "trentbinion23@hotmail.com";

function readEnv(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function normalizeSiteUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export const publicSiteUrl = normalizeSiteUrl(
  readEnv(process.env.NEXT_PUBLIC_SITE_URL, fallbackPublicSiteUrl),
);
export const supabaseUrl = readEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, fallbackSupabaseUrl);
export const supabaseAnonKey = readEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  fallbackSupabaseAnonKey,
);
export const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || "";
export const posthogHost = readEnv(
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
  "https://us.i.posthog.com",
);

export const siteAssets = {
  logo: "/images/blfsc-logo.webp",
  wordmark: "/images/blf-wordmark.svg",
  rhinoMark: "/images/blf-rhino-mark.png",
  stormVisual: "/images/storm-website.webp",
  icon192: "/images/icon-192.png",
  icon512: "/images/icon-512.png",
} as const;

export const portalLogoUrl = siteAssets.logo;

export function buildSiteUrl(path = "/") {
  return new URL(path, `${publicSiteUrl}/`).toString();
}

/** Must match portal_bootstrap_owner_email_normalized() in Supabase migrations. */
export const portalOwnerEmailNormalized = readEnv(
  process.env.NEXT_PUBLIC_PORTAL_OWNER_EMAIL,
  fallbackPortalOwnerEmail,
)
  .trim()
  .toLowerCase();
