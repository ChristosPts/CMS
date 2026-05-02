import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminRole } from '@/lib/apiAuth';

const updateSchema = z.object({
  parentId:     z.number().int().nullable().optional(),
  url:          z.string().optional().nullable(),
  linkedPageId: z.number().int().nullable().optional(),
  sortOrder:    z.number().int(),
  openInNewTab: z.boolean(),
  translations: z.array(z.object({
    locale: z.string().min(2).max(10),
    label:  z.string().default(''),
  })),
});

export async function PUT(req, { params }) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const item = await prisma.navbarItem.update({
    where: { id },
    data: {
      parentId:     d.parentId ?? null,
      url:          d.url ?? null,
      linkedPageId: d.linkedPageId ?? null,
      sortOrder:    d.sortOrder,
      openInNewTab: d.openInNewTab,
      translations: { deleteMany: {}, create: d.translations },
    },
    include: { translations: true },
  });

  return Response.json({ success: true, data: item });
}

export async function DELETE(req, { params }) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);

  // Delete children first, then the item itself
  await prisma.navbarItem.deleteMany({ where: { parentId: id } });
  await prisma.navbarItem.delete({ where: { id } });

  return Response.json({ success: true });
}
