import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { deleteUpload } from '@/lib/upload';

const itemSchema = z.object({
  image:        z.string().nullable().optional(),
  linkUrl:      z.string().nullable().optional(),
  openInNewTab: z.boolean().optional().default(false),
  sortOrder:    z.number().int().default(0),
  translations: z.array(z.object({
    locale:      z.string().min(2).max(10),
    name:        z.string().default(''),
    subtitle:    z.string().optional().default(''),
    description: z.string().optional().default(''),
  })).min(1),
});

export async function GET(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { pageId: rawId } = await params;
  const pageId = parseInt(rawId, 10);

  const items = await prisma.gridItem.findMany({
    where: { pageId },
    orderBy: { sortOrder: 'asc' },
    include: { translations: true },
  });

  return Response.json({ success: true, data: items });
}

export async function POST(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { pageId: rawId } = await params;
  const pageId = parseInt(rawId, 10);

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const maxOrder = await prisma.gridItem.aggregate({ where: { pageId }, _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const item = await prisma.gridItem.create({
    data: {
      pageId,
      image:       d.image       ?? null,
      linkUrl:     d.linkUrl     ?? null,
      openInNewTab: d.openInNewTab,
      sortOrder,
      translations: {
        create: d.translations.map((t) => ({
          locale: t.locale, name: t.name, subtitle: t.subtitle ?? '', description: t.description ?? '',
        })),
      },
    },
    include: { translations: true },
  });

  return Response.json({ success: true, data: item }, { status: 201 });
}
