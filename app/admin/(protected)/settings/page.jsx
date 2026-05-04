import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { adminAuthOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import SettingsForm from '@/components/admin/SettingsForm';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await getServerSession(adminAuthOptions);
  if (session?.user?.role !== 'ADMIN') redirect('/admin/dashboard');

  const settings = await getSettings();

  // Parse active_locales JSON → array
  let activeLocales = ['en'];
  try {
    const parsed = JSON.parse(settings.active_locales ?? '["en"]');
    if (Array.isArray(parsed)) activeLocales = parsed;
  } catch { /* use default */ }

  const initial = {
    site_name:                   settings.site_name ?? '',
    contact_email:               settings.contact_email ?? '',
    default_locale:              settings.default_locale ?? 'en',
    active_locales:              activeLocales,
    registration_enabled:        settings.registration_enabled !== 'false',
    register_salutation_enabled: settings.register_salutation_enabled === 'true',
    register_phone_enabled:      settings.register_phone_enabled === 'true',
    register_company_enabled:    settings.register_company_enabled === 'true',
    maintenance_mode:            settings.maintenance_mode === 'true',
    mail_provider:               settings.mail_provider ?? 'gmail',
    breadcrumb_enabled:          settings.breadcrumb_enabled !== 'false',
    mobile_nav_style:            settings.mobile_nav_style ?? 'accordion',
  };

  return (
    <div>
      <h4 className="mb-4">Settings</h4>
      <SettingsForm initial={initial} />
    </div>
  );
}
