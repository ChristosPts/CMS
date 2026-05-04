import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { slugify } from '@/lib/slugify';

const schema = z.object({
  translations: z.array(z.object({
    locale: z.string().min(2).max(10),
    name:   z.string().default(''),
  })).min(1),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET() {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const categories = await prisma.articleCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { translations: true, _count: { select: { articles: true } } },
  });

  return Response.json({ success: true, data: categories });
}

export async function POST(req) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d         = parsed.data;
  const firstName = d.translations[0]?.name ?? '';
  let slug        = slugify(firstName) || 'category';

  // Ensure unique slug
  let candidate = slug;
  let suffix    = 2;
  while (await prisma.articleCategory.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${suffix++}`;
  }

  const category = await prisma.articleCategory.create({
    data: {
      slug:      candidate,
      sortOrder: d.sortOrder,
      translations: {
        create: d.translations.map((t) => ({ locale: t.locale, name: t.name })),
      },
    },
    include: { translations: true },
  });

  return Response.json({ success: true, data: category }, { status: 201 });
}
