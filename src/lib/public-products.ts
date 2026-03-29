import type { Product } from "@/lib/types";
import { normalizeSiteImagePath } from "@/lib/media";
import { categoryLabel, inferCategory } from "@/lib/portal/products";
import { supabaseAnonKey, supabaseUrl } from "@/lib/site-config";

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

export async function getPublicProducts() {
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
