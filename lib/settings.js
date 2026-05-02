import prisma from './prisma';

/**
 * Returns all settings as a plain key→value object.
 */
export async function getSettings() {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/**
 * Returns the array of active locale codes, e.g. ["en", "el"].
 */
export async function getActiveLocales() {
  const row = await prisma.setting.findUnique({ where: { key: 'active_locales' } });
  try {
    const parsed = JSON.parse(row?.value ?? '["en"]');
    return Array.isArray(parsed) ? parsed : ['en'];
  } catch {
    return ['en'];
  }
}

/**
 * Returns the default locale code, e.g. "en".
 */
export async function getDefaultLocale() {
  const row = await prisma.setting.findUnique({ where: { key: 'default_locale' } });
  return row?.value || 'en';
}

/**
 * Returns { activeLocales, defaultLocale } in one round-trip.
 */
export async function getLocaleConfig() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ['active_locales', 'default_locale'] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let activeLocales = ['en'];
  try {
    const parsed = JSON.parse(map.active_locales ?? '["en"]');
    if (Array.isArray(parsed)) activeLocales = parsed;
  } catch { /* fallback to ['en'] */ }
  return {
    activeLocales,
    defaultLocale: map.default_locale || 'en',
  };
}
