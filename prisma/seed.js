const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // ── Admin user ─────────────────────────────────────────────────────────
  const hashed = await bcrypt.hash('admin', 12);
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashed,
      name: 'Administrator',
      role: 'ADMIN',
    },
  });
  console.log('✓ Admin user created (username: admin, password: admin)');

  // ── Default settings ───────────────────────────────────────────────────
  const defaults = [
    { key: 'site_name',                   value: 'My Site' },
    { key: 'active_locales',              value: JSON.stringify(['en', 'el']) },
    { key: 'default_locale',              value: 'en' },
    { key: 'contact_email',               value: '' },
    { key: 'registration_enabled',        value: 'true' },
    { key: 'maintenance_mode',            value: 'false' },
    { key: 'mail_provider',               value: 'gmail' },
    { key: 'logo',                        value: '' },
    { key: 'register_salutation_enabled', value: 'false' },
    { key: 'register_phone_enabled',      value: 'false' },
    { key: 'register_company_enabled',    value: 'false' },
    { key: 'footer_description',          value: JSON.stringify({ en: '', el: '' }) },
    { key: 'footer_copyright',            value: '' },
    { key: 'footer_privacy_url',          value: '' },
    { key: 'footer_terms_url',            value: '' },
    { key: 'footer_email',                value: '' },
    { key: 'footer_phone',                value: '' },
    { key: 'footer_address',              value: '' },
  ];

  for (const s of defaults) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('✓ Default settings seeded');

  // ── Home page ──────────────────────────────────────────────────────────
  await prisma.page.upsert({
    where: { slug: 'home' },
    update: {},
    create: {
      slug: 'home',
      template: 'HOME',
      status: 'PUBLISHED',
      sortOrder: 0,
      translations: {
        create: [
          { locale: 'en', title: 'Home', metaTitle: 'Home' },
          { locale: 'el', title: 'Αρχική', metaTitle: 'Αρχική' },
        ],
      },
    },
  });
  console.log('✓ Home page seeded');

  console.log('\n✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
