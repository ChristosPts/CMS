import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminRole } from '@/lib/apiAuth';

const itemSchema = z.object({
  parentId:     z.number().int().nullable().optional(),
  url:          z.string().optional().nullable(),
  linkedPageId: z.number().int().nullable().optional(),
  sortOrder:    z.number().int().default(0),
  openInNewTab: z.boolean().default(false),
  translations: z.array(z.object({
    locale: z.string().min(2).max(10),
    label:  z.string().default(''),
  })),
});

export async function GET() {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  const items = await prisma.navbarItem.findMany({
    orderBy: [{ sortOrder: 'asc' }],
    include: {
      translations: true,
      // Include linked page slug for display
    },
  });

  // Build tree: top-level items with children nested
  const topLevel = items
    .filter((i) => !i.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      ...item,
      children: items
        .filter((c) => c.parentId === item.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  return Response.json({ success: true, data: topLevel });
}

export async function POST(req) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const item = await prisma.navbarItem.create({
    data: {
      parentId:     d.parentId ?? null,
      url:          d.url ?? null,
      linkedPageId: d.linkedPageId ?? null,
      sortOrder:    d.sortOrder,
      openInNewTab: d.openInNewTab,
      translations: { create: d.translations },
    },
    include: { translations: true },
  });

  return Response.json({ success: true, data: item }, { status: 201 });
}
