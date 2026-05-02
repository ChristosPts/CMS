import { cookies } from 'next/headers';

const COOKIE = 'site-locale';

/**
 * Resolves the active locale for a server component request.
 * Priority: cookie → defaultLocale.
 */
export async function getRequestLocale(activeLocales, defaultLocale) {
  const store  = await cookies();
  const saved  = store.get(COOKIE)?.value;
  if (saved && activeLocales.includes(saved)) return saved;
  return defaultLocale;
}

/**
 * Picks the best translation from a translations array for the given locale,
 * falling back to defaultLocale, then the first available.
 */
export function pickTranslation(translations, locale, defaultLocale) {
  return (
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === defaultLocale) ??
    translations[0] ??
    null
  );
}
