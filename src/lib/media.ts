const imageFilePattern = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const imageAliases = new Map([
  ["storm-website.png", "/images/storm-website.webp"],
  ["images/storm-website.png", "/images/storm-website.webp"],
  ["blfsc-logo.png", "/images/blfsc-logo.webp"],
  ["images/blfsc-logo.png", "/images/blfsc-logo.webp"],
]);

export function normalizeSiteImagePath(value: string | null | undefined, fallback: string) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw;
  }

  const cleaned = raw.replace(/^\.?\/*/, "");
  if (!cleaned) return fallback;
  const aliased = imageAliases.get(cleaned.toLowerCase());
  if (aliased) {
    return aliased;
  }

  if (raw.startsWith("/images/")) {
    return raw;
  }

  if (cleaned.startsWith("images/")) {
    return `/${cleaned}`;
  }

  if (imageFilePattern.test(cleaned) && !cleaned.includes("/")) {
    return `/images/${cleaned}`;
  }

  return raw.startsWith("/") ? raw : `/${cleaned}`;
}
