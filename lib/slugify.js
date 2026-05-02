/**
 * Converts a string to a URL-safe slug.
 * Strips non-ASCII characters (including Greek) rather than transliterating —
 * slugs are always generated from the default locale title.
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')                   // decompose accented chars
    .replace(/[̀-ͯ]/g, '')   // strip combining diacritics
    .replace(/[^\w\s-]/g, '')          // strip non-word chars (incl. Greek)
    .trim()
    .replace(/[\s_]+/g, '-')           // spaces/underscores → hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^-|-$/g, '');            // trim leading/trailing hyphens
}

/**
 * Builds an article's public slug: "{id}-{slugified-title}"
 */
export function articleSlug(id, title) {
  const base = slugify(title) || 'article';
  return `${id}-${base}`;
}
