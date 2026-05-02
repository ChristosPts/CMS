import prisma from '@/lib/prisma';
import { requireAdminRole } from '@/lib/apiAuth';
import { deleteUpload } from '@/lib/upload';

// POST — full replace of all socials
export async function POST(req) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const incoming = Array.isArray(body.socials) ? body.socials : [];

  // Find existing socials to clean up removed icons
  const existing = await prisma.footerSocial.findMany();
  const incomingIds = new Set(incoming.filter((s) => s.id).map((s) => s.id));
  const toDelete = existing.filter((s) => !incomingIds.has(s.id));

  for (const s of toDelete) {
    if (s.icon) await deleteUpload(s.icon).catch(() => {});
  }

  await prisma.$transaction([
    prisma.footerSocial.deleteMany(),
    ...incoming.map((s, i) =>
      prisma.footerSocial.create({
        data: {
          icon:      s.icon || '',
          url:       String(s.url  || ''),
          label:     String(s.label || ''),
          sortOrder: i,
        },
      })
    ),
  ]);

  return Response.json({ success: true });
}
