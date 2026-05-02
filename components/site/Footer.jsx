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

export default async function Footer() {
  const { activeLocales, defaultLocale } = await getLocaleConfig();
  const locale = await getRequestLocale(activeLocales, defaultLocale);

  const [settings, navItems, socials] = await Promise.all([
    prisma.setting.findMany({
      where: { key: { in: ['logo', 'site_name', 'footer_description', 'footer_copyright', 'footer_privacy_url', 'footer_terms_url', 'footer_email', 'footer_phone', 'footer_address'] } },
    }),
    prisma.footerNavItem.findMany({
      orderBy: [{ sortOrder: 'asc' }],
      include: { translations: true },
    }),
    prisma.footerSocial.findMany({ orderBy: [{ sortOrder: 'asc' }] }),
  ]);

  const get = (key) => settings.find((s) => s.key === key)?.value ?? '';

  const logo      = get('logo');
  const siteName  = get('site_name') || 'Site';
  const copyright = get('footer_copyright');
  const privacyUrl = get('footer_privacy_url');
  const termsUrl   = get('footer_terms_url');
  const footerEmail   = get('footer_email');
  const footerPhone   = get('footer_phone');
  const footerAddress = get('footer_address');

  let description = '';
  try { description = JSON.parse(get('footer_description'))[locale] || JSON.parse(get('footer_description'))[defaultLocale] || ''; } catch {}

  const linkedPageIds = [...new Set(navItems.filter((i) => i.linkedPageId).map((i) => i.linkedPageId))];
  const linkedPages   = linkedPageIds.length
    ? await prisma.page.findMany({ where: { id: { in: linkedPageIds } }, select: { id: true, slug: true } })
    : [];

  const columns = navItems
    .filter((i) => !i.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      children: navItems.filter((c) => c.parentId === item.id).sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  const hasContact = footerEmail || footerPhone || footerAddress;
  const hasBottom  = copyright || privacyUrl || termsUrl;

  return (
    <footer className="bg-dark text-light pt-5 pb-4 mt-auto">
      <div className="container">
        <div className="row g-4">

          {/* Far left — logo + description */}
          <div className="col-12 col-md-6 col-lg-3">
            {logo ? (
              <Link href="/" className="d-inline-block mb-3">
                <Image
                  src={`/uploads/${logo}`}
                  alt={siteName}
                  width={140}
                  height={40}
                  style={{ objectFit: 'contain', maxHeight: 40, width: 'auto', filter: 'brightness(0) invert(1)' }}
                  unoptimized
                />
              </Link>
            ) : (
              <Link href="/" className="d-inline-block mb-3 fw-bold fs-5 text-white text-decoration-none">
                {siteName}
              </Link>
            )}
            {description && (
              <p className="text-secondary small">{description}</p>
            )}
          </div>

          {/* Middle — nav columns */}
          {columns.map((col) => {
            const heading = pickLabel(col.translations, locale, defaultLocale);
            const href    = resolveHref(col, linkedPages);
            return (
              <div key={col.id} className="col-6 col-md-3 col-lg-2">
                {href && href !== '#' ? (
                  <Link href={href} className="d-block fw-semibold text-white mb-3 text-decoration-none small text-uppercase letter-spacing-1">
                    {heading}
                  </Link>
                ) : (
                  <div className="fw-semibold text-white mb-3 small text-uppercase">{heading}</div>
                )}
                <ul className="list-unstyled mb-0">
                  {col.children.map((child) => (
                    <li key={child.id} className="mb-2">
                      <Link
                        href={resolveHref(child, linkedPages)}
                        className="text-secondary text-decoration-none small"
                        style={{ transition: 'color 0.15s' }}
                        {...(child.openInNewTab ? { target: '_blank', rel: 'noreferrer' } : {})}
                      >
                        {pickLabel(child.translations, locale, defaultLocale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Far right — contact + socials */}
          {(hasContact || socials.length > 0) && (
            <div className="col-12 col-md-6 col-lg-3 ms-lg-auto">
              {hasContact && (
                <ul className="list-unstyled mb-4">
                  {footerEmail && (
                    <li className="mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-envelope-fill text-secondary" />
                      <a href={`mailto:${footerEmail}`} className="text-secondary text-decoration-none small">{footerEmail}</a>
                    </li>
                  )}
                  {footerPhone && (
                    <li className="mb-2 d-flex align-items-center gap-2">
                      <i className="bi bi-telephone-fill text-secondary" />
                      <a href={`tel:${footerPhone}`} className="text-secondary text-decoration-none small">{footerPhone}</a>
                    </li>
                  )}
                  {footerAddress && (
                    <li className="d-flex align-items-start gap-2">
                      <i className="bi bi-geo-alt-fill text-secondary mt-1" />
                      <address className="text-secondary small mb-0" style={{ whiteSpace: 'pre-line' }}>{footerAddress}</address>
                    </li>
                  )}
                </ul>
              )}

              {socials.length > 0 && (
                <div className="d-flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      title={s.label}
                      className="d-flex align-items-center justify-content-center rounded border border-secondary"
                      style={{ width: 36, height: 36, transition: 'opacity 0.15s' }}
                    >
                      {s.icon ? (
                        <Image
                          src={`/uploads/${s.icon}`}
                          alt={s.label}
                          width={20}
                          height={20}
                          style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                          unoptimized
                        />
                      ) : (
                        <span className="text-secondary small">{s.label.slice(0, 2)}</span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        {hasBottom && (
          <div className="border-top border-secondary mt-4 pt-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="text-secondary small">{copyright}</div>
            <div className="d-flex gap-3">
              {privacyUrl && (
                <Link href={privacyUrl} className="text-secondary small text-decoration-none">Privacy Policy</Link>
              )}
              {termsUrl && (
                <Link href={termsUrl} className="text-secondary small text-decoration-none">Terms of Service</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
