export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9а-яіїєґ\-]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function decodeSlugParam(value: string): string {
  let decoded = value.trim();
  if (!decoded) return '';

  for (let i = 0; i < 2; i += 1) {
    if (!decoded.includes('%')) break;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  return decoded.trim();
}

export function normalizeProductSlug(
  slug: string | undefined | null,
  fallbackName?: string,
): string {
  const decoded = decodeSlugParam(String(slug ?? ''));
  const slugified = slugify(decoded);
  if (slugified) return slugified;

  const fromName = slugify(String(fallbackName ?? ''));
  if (fromName) return fromName;

  return '';
}
