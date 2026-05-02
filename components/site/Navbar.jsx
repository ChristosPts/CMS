import Link from 'next/link';
import Image from 'next/image';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import { getRequestLocale } from '@/lib/locale';

function pickLabel(translations, locale, defaultLocale) {
  return (
    translations.find((t) => t.locale === locale)?.label ||
    translations.find((t) => t.locale === defaultLocale)?.label ||
    translations[0]?.label ||
    ''
  );
}

function resolveHref(item, pages) {
  if (item.linkedPageId) {
    const page = pages.find((p) => p.id === item.linkedPageId);
    return page ? `/${page.slug}` : '#';
  }
  return item.url || '#';
}

export default async function Navbar() {
  const [{ activeLocales, defaultLocale }, items, settings] = await Promise.all([
    getLocaleConfig(),
    prisma.navbarItem.findMany({
      orderBy: [{ sortOrder: 'asc' }],
      include: { translations: true },
    }),
    prisma.setting.findMany({ where: { key: { in: ['site_name', 'logo'] } } }),
  ]);

  const locale   = await getRequestLocale(activeLocales, defaultLocale);
  const siteName = settings.find((s) => s.key === 'site_name')?.value || 'Site';
  const logo     = settings.find((s) => s.key === 'logo')?.value || '';

  if (!items.length) return null;

  // Resolve linked page slugs (batch fetch)
  const linkedPageIds = [...new Set(items.filter((i) => i.linkedPageId).map((i) => i.linkedPageId))];
  const linkedPages   = linkedPageIds.length
    ? await prisma.page.findMany({ where: { id: { in: linkedPageIds } }, select: { id: true, slug: true } })
    : [];

  const topLevel = items
    .filter((i) => !i.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const getChildren = (parentId) =>
    items.filter((i) => i.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <nav className="navbar navbar-expand-lg bg-white border-bottom">
      <div className="container">
        <Link href="/" className="navbar-brand fw-semibold d-flex align-items-center gap-2">
          {logo ? (
            <Image
              src={`/uploads/${logo}`}
              alt={siteName}
              width={120}
              height={36}
              style={{ objectFit: 'contain', maxHeight: 36, width: 'auto' }}
              unoptimized
              priority
            />
          ) : (
            siteName
          )}
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#siteNavbar"
          aria-controls="siteNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="siteNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {topLevel.map((item) => {
              const children = getChildren(item.id);
              const label    = pickLabel(item.translations, locale, defaultLocale);
              const href     = resolveHref(item, linkedPages);

              if (children.length > 0) {
                return (
                  <li key={item.id} className="nav-item dropdown">
                    <button
                      className="nav-link dropdown-toggle btn btn-link text-decoration-none"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      {label}
                    </button>
                    <ul className="dropdown-menu">
                      {children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={resolveHref(child, linkedPages)}
                            className="dropdown-item"
                            {...(child.openInNewTab ? { target: '_blank', rel: 'noreferrer' } : {})}
                          >
                            {pickLabel(child.translations, locale, defaultLocale)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }

              return (
                <li key={item.id} className="nav-item">
                  <Link
                    href={href}
                    className="nav-link"
                    {...(item.openInNewTab ? { target: '_blank', rel: 'noreferrer' } : {})}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
