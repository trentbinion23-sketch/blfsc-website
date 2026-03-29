const imageFilePattern = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

export function normalizeSiteImagePath(value: string | null | undefined, fallback: string) {
  const raw = String(value || "").trim();
  if (!raw) return fallback;

  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("/images/")) {
    return raw;
  }

  const cleaned = raw.replace(/^\.?\/*/, "");
  if (!cleaned) return fallback;

  if (cleaned.startsWith("images/")) {
    return `/${cleaned}`;
  }

  if (imageFilePattern.test(cleaned) && !cleaned.includes("/")) {
    return `/images/${cleaned}`;
  }

  return raw.startsWith("/") ? raw : `/${cleaned}`;
}
