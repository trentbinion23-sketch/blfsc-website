import { mergeSiteContent, siteContentDefaults } from "@/lib/site-content-contract";
import { supabaseAnonKey, supabaseUrl } from "@/lib/site-config";

const SITE_CONTENT_ID = "public_site";
const siteContentRevalidateSeconds = 60;

export { mergeSiteContent, siteContentDefaults };
export type { SiteContent } from "@/lib/site-content-contract";

export async function getPublicSiteContent() {
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/site_content?select=content&id=eq.${SITE_CONTENT_ID}`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        next: { revalidate: siteContentRevalidateSeconds },
      },
    );

    if (!response.ok) {
      return siteContentDefaults;
    }

    const rows = (await response.json()) as Array<{ content?: unknown }>;
    return mergeSiteContent(rows[0]?.content);
  } catch {
    return siteContentDefaults;
  }
}
