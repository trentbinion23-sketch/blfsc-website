import type { Product } from "@/lib/types";
import { normalizeSiteImagePath } from "@/lib/media";
import { categoryLabel, inferCategory } from "@/lib/portal/products";

const SHOPIFY_API_VERSION = "2025-01";
const productFallbackImage = "/images/blfsc-logo.webp";

function shopifyStoreDomain() {
  return process.env.SHOPIFY_STORE_DOMAIN?.trim() || "";
}

function shopifyClientId() {
  return process.env.SHOPIFY_CLIENT_ID?.trim() || "";
}

function shopifyClientSecret() {
  return process.env.SHOPIFY_CLIENT_SECRET?.trim() || "";
}

export function isShopifyConfigured() {
  return !!(shopifyStoreDomain() && shopifyClientId() && shopifyClientSecret());
}

async function getAccessToken(): Promise<string | null> {
  const domain = shopifyStoreDomain();
  const clientId = shopifyClientId();
  const clientSecret = shopifyClientSecret();

  try {
    const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

type ShopifyProduct = {
  id: number;
  title?: string;
  body_html?: string;
  product_type?: string;
  status?: string;
  images?: Array<{ src: string }>;
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || ""
  );
}

function excerptFromText(value: string) {
  const clean = value.trim();
  if (!clean) return "Official BLFSC members merch item.";
  if (clean.length <= 140) return clean;
  return `${clean.slice(0, 139).trimEnd()}...`;
}

function normalizeShopifyProduct(item: ShopifyProduct): Product | null {
  const name = item.title?.trim();
  if (!name) return null;

  const rawDescription = item.body_html ? stripHtml(item.body_html) : "";
  const description = rawDescription || "Official BLFSC members merch item.";
  const slug = slugify(name);
  const id = String(item.id);

  const inferredCategory = inferCategory({ category: item.product_type, name });
  const category = categoryLabel(inferredCategory);
  const image = normalizeSiteImagePath(
    item.images?.[0]?.src ?? "",
    productFallbackImage,
  );

  return {
    id,
    slug: slug || id,
    name,
    category,
    excerpt: excerptFromText(rawDescription),
    description,
    image,
    featured: true,
  };
}

export async function getShopifyProducts(): Promise<Product[]> {
  const domain = shopifyStoreDomain();
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const url = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/products.json?status=active&limit=250`;
    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) return [];

    const data = (await response.json()) as { products?: ShopifyProduct[] };
    return (data.products ?? [])
      .map(normalizeShopifyProduct)
      .filter((p): p is Product => p !== null);
  } catch {
    return [];
  }
}
