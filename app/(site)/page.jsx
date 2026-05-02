import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import { getRequestLocale, pickTranslation } from '@/lib/locale';

const SITE_URL = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');

// ── Metadata ───────────────────────────────────────────────────────────────

export async function generateMetadata() {
  const [siteSetting, homePage] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'site_name' } }),
    prisma.page.findFirst({ where: { template: 'HOME', status: 'PUBLISHED' }, include: { translations: true } }),
  ]);

  const siteName = siteSetting?.value || 'Site';

  const { activeLocales, defaultLocale } = await getLocaleConfig();
  const locale      = await getRequestLocale(activeLocales, defaultLocale);
  const translation = homePage ? pickTranslation(homePage.translations, locale, defaultLocale) : null;

  const title       = translation?.metaTitle || translation?.title || siteName;
  const description = translation?.metaDescription || translation?.summary || '';

  return {
    title:       { absolute: title },
    description,
    openGraph: {
      type:     'website',
      url:      `${SITE_URL}/`,
      title,
      description,
      siteName,
    },
    twitter: {
      card:        'summary',
      title,
      description,
    },
    alternates: { canonical: `${SITE_URL}/` },
  };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const siteSetting = await prisma.setting.findUnique({ where: { key: 'site_name' } });
  const siteName    = siteSetting?.value || 'Site';

  // WebSite JSON-LD — helps search engines understand the site structure
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':    'WebSite',
    name:       siteName,
    url:        `${SITE_URL}/`,
    potentialAction: {
      '@type':       'SearchAction',
      target:        `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="container py-5">
        <h1>Welcome</h1>
        <p className="text-muted">
          This is a placeholder home page. Configure your home page content per client.
        </p>
      </main>
    </>
  );
}
