import { normalizeSiteImagePath } from "@/lib/media";

export const portalCategoryLabels = {
  all: "All items",
  shirts: "Shirts",
  outerwear: "Outerwear",
  pants: "Pants",
  accessories: "Accessories",
  other: "Other",
} as const;

export const portalProductCategoryOptions = [
  "shirts",
  "outerwear",
  "pants",
  "accessories",
  "other",
] as const;

type PortalProductRecord = {
  active?: boolean | null;
  category?: string | null;
  desc?: string | null;
  description?: string | null;
  hasSizes?: boolean | null;
  image?: string | null;
  image_url?: string | null;
  name?: string | null;
  price?: number | string | null;
  [key: string]: unknown;
};

export function normalizeCategory(value: string | null | undefined) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";

  const map: Record<string, string> = {
    tee: "shirts",
    tees: "shirts",
    shirt: "shirts",
    shirts: "shirts",
    singlet: "shirts",
    jersey: "shirts",
    hoodie: "outerwear",
    hoodies: "outerwear",
    jumper: "outerwear",
    jacket: "outerwear",
    jackets: "outerwear",
    outerwear: "outerwear",
    pant: "pants",
    pants: "pants",
    short: "pants",
    shorts: "pants",
    jogger: "pants",
    joggers: "pants",
    trackpants: "pants",
    trackies: "pants",
    accessory: "accessories",
    accessories: "accessories",
    cap: "accessories",
    hat: "accessories",
    beanie: "accessories",
    mug: "accessories",
    sticker: "accessories",
    stickers: "accessories",
    stubby: "accessories",
    mat: "accessories",
    bag: "accessories",
    patch: "accessories",
    keyring: "accessories",
    other: "other",
  };

  return map[raw] || raw;
}

export function inferCategory(product: PortalProductRecord) {
  const direct = normalizeCategory(product.category);
  if (direct) return direct;

  const haystack =
    `${product.name || ""} ${product.description || product.desc || ""}`.toLowerCase();

  if (/(tee|shirt|singlet|jersey)/.test(haystack)) return "shirts";
  if (/(hoodie|jumper|jacket|outerwear|crew)/.test(haystack)) return "outerwear";
  if (/(pant|pants|short|shorts|jogger|track)/.test(haystack)) return "pants";
  if (/(cap|hat|beanie|mug|sticker|stubby|mat|accessor|bag|patch|keyring)/.test(haystack))
    return "accessories";

  return "other";
}

export function categoryLabel(category: string) {
  return portalCategoryLabels[category as keyof typeof portalCategoryLabels] || "Merch";
}

export function productHasSizes(product: PortalProductRecord) {
  if (typeof product.hasSizes === "boolean") return product.hasSizes;

  const name = String(product.name || "").toLowerCase();
  return ["tee", "hoodie", "singlet", "shirt", "jumper", "pant", "short"].some((word) =>
    name.includes(word),
  );
}

export function normalizePortalProduct(product: PortalProductRecord, fallbackImage: string) {
  return {
    ...product,
    price: Number(product.price || 0),
    active: product.active !== false,
    hasSizes: productHasSizes(product),
    displayImage: normalizeSiteImagePath(product.image_url || product.image || "", fallbackImage),
    displayDescription: product.description || product.desc || "",
    displayCategory: inferCategory(product),
  };
}
