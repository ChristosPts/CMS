import '@/styles/site.css';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { getLocaleConfig } from '@/lib/settings';
import { getRequestLocale } from '@/lib/locale';
import Footer from '@/components/site/Footer';
import Navbar from '@/components/site/Navbar';
import LocaleSwitcher from '@/components/site/LocaleSwitcher';
import SiteBootstrapInit from '@/components/site/SiteBootstrapInit';
import SiteSessionProvider from '@/components/site/SiteSessionProvider';

export default async function SiteLayout({ children }) {
  const [{ activeLocales, defaultLocale }, maintenanceSetting] = await Promise.all([
    getLocaleConfig(),
    prisma.setting.findUnique({ where: { key: 'maintenance_mode' } }),
  ]);

  const currentLocale  = await getRequestLocale(activeLocales, defaultLocale);
  const inMaintenance  = maintenanceSetting?.value === 'true';

  const headersList = await headers();
  const referer     = headersList.get('referer') ?? '/';
  let returnPath    = '/';
  try { returnPath = new URL(referer).pathname; } catch { /* keep default */ }

  // Auth pages must always be accessible so users can log in
  // (The actual path check is approximate since the layout can't see the full URL easily;
  //  the auth routes return quickly regardless.)
  const isAuthPath = returnPath.startsWith('/auth');

  if (inMaintenance && !isAuthPath) {
    return (
      <SiteSessionProvider>
        <SiteBootstrapInit />
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
          <div className="text-center px-3">
            <i className="bi bi-tools fs-1 text-muted d-block mb-3" />
            <h2 className="mb-2">Under Maintenance</h2>
            <p className="text-muted">We&apos;ll be back shortly. Thank you for your patience.</p>
          </div>
        </div>
      </SiteSessionProvider>
    );
  }

  return (
    <SiteSessionProvider>
      <SiteBootstrapInit />
      <div className="d-flex flex-column min-vh-100">
      {/* Navbar — populated from the navbar editor */}
      <Navbar />

      {/* Locale switcher — shown when more than one locale is active */}
      {activeLocales.length > 1 && (
        <div className="border-bottom py-1">
          <div className="container d-flex justify-content-end">
            <LocaleSwitcher
              activeLocales={activeLocales}
              currentLocale={currentLocale}
              returnPath={returnPath}
            />
          </div>
        </div>
      )}

      <div className="flex-grow-1">{children}</div>

        <Footer />
      </div>
    </SiteSessionProvider>
  );
}
