import prisma from '@/lib/prisma';
import { requireAdminRole } from '@/lib/apiAuth';

// GET — load all footer settings + nav tree + socials
export async function GET() {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  const [settings, navItems, socials] = await Promise.all([
    prisma.setting.findMany({
      where: { key: { in: ['footer_description', 'footer_copyright', 'footer_privacy_url', 'footer_terms_url', 'footer_email', 'footer_phone', 'footer_address'] } },
    }),
    prisma.footerNavItem.findMany({
      orderBy: [{ sortOrder: 'asc' }],
      include: { translations: true },
    }),
    prisma.footerSocial.findMany({ orderBy: [{ sortOrder: 'asc' }] }),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const topLevel = navItems
    .filter((i) => !i.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      children: navItems
        .filter((c) => c.parentId === item.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  return Response.json({ success: true, data: { settings: settingsMap, navTree: topLevel, socials } });
}

// POST — save footer settings
export async function POST(req) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const keys = ['footer_description', 'footer_copyright', 'footer_privacy_url', 'footer_terms_url', 'footer_email', 'footer_phone', 'footer_address'];

  await prisma.$transaction(
    keys.map((key) => {
      const value = key === 'footer_description'
        ? JSON.stringify(body[key] ?? {})
        : String(body[key] ?? '');
      return prisma.setting.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      });
    })
  );

  return Response.json({ success: true });
}
