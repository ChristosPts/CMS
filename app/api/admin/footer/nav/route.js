import prisma from '@/lib/prisma';
import { requireAdminRole } from '@/lib/apiAuth';

// POST — full replace of footer nav tree
export async function POST(req) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const tree = Array.isArray(body.tree) ? body.tree : [];

  // Delete all and re-create (simple approach for low-traffic admin)
  await prisma.footerNavItemTranslation.deleteMany();
  await prisma.footerNavItem.deleteMany();

  for (let i = 0; i < tree.length; i++) {
    const parent = tree[i];
    const parentRecord = await prisma.footerNavItem.create({
      data: {
        url:          parent.url       || null,
        linkedPageId: parent.linkedPageId ? Number(parent.linkedPageId) : null,
        sortOrder:    i,
        openInNewTab: Boolean(parent.openInNewTab),
        translations: {
          create: Object.entries(parent.labelJson ?? {}).map(([locale, label]) => ({ locale, label: String(label) })),
        },
      },
    });

    const children = Array.isArray(parent.children) ? parent.children : [];
    for (let j = 0; j < children.length; j++) {
      const child = children[j];
      await prisma.footerNavItem.create({
        data: {
          parentId:     parentRecord.id,
          url:          child.url       || null,
          linkedPageId: child.linkedPageId ? Number(child.linkedPageId) : null,
          sortOrder:    j,
          openInNewTab: Boolean(child.openInNewTab),
          translations: {
            create: Object.entries(child.labelJson ?? {}).map(([locale, label]) => ({ locale, label: String(label) })),
          },
        },
      });
    }
  }

  return Response.json({ success: true });
}
