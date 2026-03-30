import type { Product } from "@/lib/types";
import { normalizeSiteImagePath } from "@/lib/media";
import { categoryLabel, inferCategory } from "@/lib/portal/products";
import { supabaseAnonKey, supabaseUrl, shopifyStoreDomain, shopifyStorefrontToken } from "@/lib/site-config";

type ProductRow = {
  id?: number | string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  desc?: string | null;
  image_url?: string | null;
  image?: string | null;
};

const productFallbackImage = "/images/blfsc-logo.webp";
const publicProductsRevalidateSeconds = 60;

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

function normalizePublicProduct(row: ProductRow): Product | null {
  const name = String(row.name || "").trim();
  if (!name) return null;

  const description = String(row.description || row.desc || "").trim();
  const inferredCategory = inferCategory(row);
  const category = categoryLabel(inferredCategory);
  const slug = slugify(name);
  const idValue = row.id == null ? slug : String(row.id);

  return {
    id: idValue || slug,
    slug: slug || idValue || "product",
    name,
    category,
    excerpt: excerptFromText(description),
    description: description || "Official BLFSC members merch item.",
    image: normalizeSiteImagePath(row.image_url || row.image || "", productFallbackImage),
    featured: true,
  };
}

// ---------------------------------------------------------------------------
// Shopify Storefront API product fetch (preferred when configured)
// ---------------------------------------------------------------------------

type ShopifyProductNode = {
  id: string;
  title: string;
  description: string;
  productType: string;
  handle: string;
  availableForSale: boolean;
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
};

type ShopifyProductsResponse = {
  data?: {
    products: { edges: Array<{ node: ShopifyProductNode }> };
  };
  errors?: Array<{ message: string }>;
};

async function getShopifyPublicProducts(): Promise<Product[]> {
  if (!shopifyStoreDomain || !shopifyStorefrontToken) return [];

  const query = `query { products(first: 50, sortKey: CREATED_AT, reverse: true) { edges { node { id title description productType handle availableForSale images(first: 1) { edges { node { url altText } } } } } } }`;

  const response = await fetch(
    `https://${shopifyStoreDomain}/api/2025-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": shopifyStorefrontToken,
      },
      body: JSON.stringify({ query }),
      next: { revalidate: publicProductsRevalidateSeconds },
    },
  );

  if (!response.ok) return [];

  const result = (await response.json()) as ShopifyProductsResponse;
  if (result.errors?.length) return [];

  return (result.data?.products.edges ?? [])
    .filter((e) => e.node.availableForSale)
    .map((e) => {
      const node = e.node;
      const image = node.images.edges[0]?.node.url || productFallbackImage;
      const name = node.title || "Merch item";
      const numericId = node.id.match(/(\d+)$/)?.[1] || node.handle;

      return {
        id: numericId,
        slug: node.handle || slugify(name),
        name,
        category: categoryLabel(node.productType?.toLowerCase() || "other"),
        excerpt: excerptFromText(node.description),
        description: node.description || "Official BLFSC members merch item.",
        image,
        featured: true,
      };
    });
}

// ---------------------------------------------------------------------------
// Supabase product fetch (fallback)
// ---------------------------------------------------------------------------

async function getSupabasePublicProducts(): Promise<Product[]> {
  try {
    const url = new URL("/rest/v1/products", `${supabaseUrl}/`);
    url.searchParams.set("select", "id,name,category,description,desc,image_url,image");
    url.searchParams.set("or", "(active.is.null,active.eq.true)");
    url.searchParams.set("order", "created_at.desc");

    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      next: { revalidate: publicProductsRevalidateSeconds },
    });

    if (!response.ok) {
      return [] as Product[];
    }

    const rows = (await response.json()) as ProductRow[];
    return rows
      .map((row) => normalizePublicProduct(row))
      .filter((row): row is Product => row !== null);
  } catch {
    return [] as Product[];
  }
}

// ---------------------------------------------------------------------------
// Public export: tries Shopify first, falls back to Supabase
// ---------------------------------------------------------------------------

export async function getPublicProducts(): Promise<Product[]> {
  if (shopifyStoreDomain && shopifyStorefrontToken) {
    try {
      const products = await getShopifyPublicProducts();
      if (products.length > 0) return products;
    } catch {
      // fall through to Supabase
    }
  }
  return getSupabasePublicProducts();
}
