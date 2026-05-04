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

// Build recursive tree from flat list (max 3 levels)
function buildTree(items, parentId = null, depth = 0) {
  if (depth >= 3) return [];
  return items
    .filter((i) => i.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({ ...item, children: buildTree(items, item.id, depth + 1) }));
}

// Desktop: recursive dropdown with CSS-based sub-menus
function NavItem({ item, locale, defaultLocale, pages, depth = 0 }) {
  const label    = pickLabel(item.translations, locale, defaultLocale);
  const href     = resolveHref(item, pages);
  const hasKids  = item.children?.length > 0;
  const newTab   = item.openInNewTab ? { target: '_blank', rel: 'noreferrer' } : {};

  if (depth === 0) {
    if (hasKids) {
      return (
        <li className="nav-item dropdown position-relative">
          <button className="nav-link dropdown-toggle btn btn-link text-decoration-none" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            {label}
          </button>
          <ul className="dropdown-menu">
            {item.children.map((child) => (
              <NavItem key={child.id} item={child} locale={locale} defaultLocale={defaultLocale} pages={pages} depth={1} />
            ))}
          </ul>
        </li>
      );
    }
    return (
      <li className="nav-item">
        <Link href={href} className="nav-link" {...newTab}>{label}</Link>
      </li>
    );
  }

  // Nested dropdown (level 2+)
  if (hasKids) {
    return (
      <li className="dropdown-submenu position-relative">
        <Link href={href} className="dropdown-item dropdown-toggle" {...newTab}>
          {label}
        </Link>
        <ul className="dropdown-menu">
          {item.children.map((child) => (
            <NavItem key={child.id} item={child} locale={locale} defaultLocale={defaultLocale} pages={pages} depth={depth + 1} />
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li>
      <Link href={href} className="dropdown-item" {...newTab}>{label}</Link>
    </li>
  );
}

// Mobile accordion items
function AccordionNavItem({ item, locale, defaultLocale, pages, depth = 0 }) {
  const label   = pickLabel(item.translations, locale, defaultLocale);
  const href    = resolveHref(item, pages);
  const hasKids = item.children?.length > 0;
  const newTab  = item.openInNewTab ? { target: '_blank', rel: 'noreferrer' } : {};
  const colId   = `mob-${item.id}`;
  const indent  = depth * 1;

  if (hasKids) {
    return (
      <div style={{ paddingLeft: `${indent}rem` }}>
        <button
          className="nav-link w-100 text-start d-flex justify-content-between align-items-center"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target={`#${colId}`}
          aria-expanded="false"
        >
          {label}
          <i className="bi bi-chevron-down small" />
        </button>
        <div className="collapse" id={colId}>
          {item.children.map((child) => (
            <AccordionNavItem key={child.id} item={child} locale={locale} defaultLocale={defaultLocale} pages={pages} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: `${indent}rem` }}>
      <Link href={href} className="nav-link" {...newTab}>{label}</Link>
    </div>
  );
}

export default async function Navbar() {
  const [{ activeLocales, defaultLocale }, items, settings] = await Promise.all([
    getLocaleConfig(),
    prisma.navbarItem.findMany({ orderBy: [{ sortOrder: 'asc' }], include: { translations: true } }),
    prisma.setting.findMany({ where: { key: { in: ['site_name', 'logo', 'mobile_nav_style'] } } }),
  ]);

  const locale         = await getRequestLocale(activeLocales, defaultLocale);
  const siteName       = settings.find((s) => s.key === 'site_name')?.value        || 'Site';
  const logo           = settings.find((s) => s.key === 'logo')?.value             || '';
  const mobileStyle    = settings.find((s) => s.key === 'mobile_nav_style')?.value || 'accordion';
  const useOffcanvas   = mobileStyle === 'offcanvas';

  if (!items.length) return null;

  const linkedPageIds = [...new Set(items.filter((i) => i.linkedPageId).map((i) => i.linkedPageId))];
  const linkedPages   = linkedPageIds.length
    ? await prisma.page.findMany({ where: { id: { in: linkedPageIds } }, select: { id: true, slug: true } })
    : [];

  const tree = buildTree(items);

  const logoEl = logo ? (
    <Image src={`/uploads/${logo}`} alt={siteName} width={120} height={36} style={{ objectFit: 'contain', maxHeight: 36, width: 'auto' }} unoptimized priority />
  ) : siteName;

  if (useOffcanvas) {
    return (
      <>
        <nav className="navbar bg-white border-bottom">
          <div className="container">
            <Link href="/" className="navbar-brand fw-semibold d-flex align-items-center gap-2">{logoEl}</Link>
            <button className="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#siteNavOffcanvas" aria-controls="siteNavOffcanvas" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon" />
            </button>
          </div>
        </nav>

        <div className="offcanvas offcanvas-end" tabIndex="-1" id="siteNavOffcanvas" aria-labelledby="siteNavOffcanvasLabel">
          <div className="offcanvas-header border-bottom">
            <Link href="/" className="fw-semibold text-decoration-none">{logoEl}</Link>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" />
          </div>
          <div className="offcanvas-body">
            <nav>
              {tree.map((item) => (
                <AccordionNavItem key={item.id} item={item} locale={locale} defaultLocale={defaultLocale} pages={linkedPages} />
              ))}
            </nav>
          </div>
        </div>
      </>
    );
  }

  // Default: accordion on mobile, nested dropdowns on desktop
  return (
    <>
      <style>{`
        .dropdown-submenu .dropdown-menu { display:none; position:absolute; left:100%; top:0; }
        .dropdown-submenu:hover > .dropdown-menu { display:block; }
        .dropdown-submenu .dropdown-toggle::after { border-top:0; border-right:0; border-bottom:0; border-left:.3em solid; vertical-align:.1em; }
      `}</style>

      <nav className="navbar navbar-expand-lg bg-white border-bottom">
        <div className="container">
          <Link href="/" className="navbar-brand fw-semibold d-flex align-items-center gap-2">{logoEl}</Link>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#siteNavbar" aria-controls="siteNavbar" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon" />
          </button>

          {/* Desktop */}
          <div className="collapse navbar-collapse d-none d-lg-flex" id="siteNavbar">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {tree.map((item) => (
                <NavItem key={item.id} item={item} locale={locale} defaultLocale={defaultLocale} pages={linkedPages} depth={0} />
              ))}
            </ul>
          </div>

          {/* Mobile accordion */}
          <div className="collapse navbar-collapse d-lg-none" id="siteNavbar">
            <nav className="py-2">
              {tree.map((item) => (
                <AccordionNavItem key={item.id} item={item} locale={locale} defaultLocale={defaultLocale} pages={linkedPages} />
              ))}
            </nav>
          </div>
        </div>
      </nav>
    </>
  );
}
