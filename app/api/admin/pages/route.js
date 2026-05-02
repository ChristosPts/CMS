import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { slugify } from '@/lib/slugify';

const translationSchema = z.object({
  locale:          z.string().min(2).max(10),
  title:           z.string().default(''),
  summary:         z.string().optional().default(''),
  content:         z.string().optional().default(''),
  metaTitle:       z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
});

const createSchema = z.object({
  template:       z.enum(['BASIC', 'GRID', 'ARTICLE_LIST', 'ARTICLE_SINGLE', 'CONTACT', 'HOME']),
  status:         z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN']).default('DRAFT'),
  sortOrder:      z.number().int().default(0),
  visibility:     z.enum(['PUBLIC', 'AUTHENTICATED_ONLY', 'ROLE_RESTRICTED']).default('PUBLIC'),
  restrictedRole: z.string().optional().nullable(),
  slug:           z.string().optional(),
  featuredImage:  z.string().nullable().optional(),
  mapEmbedUrl:    z.string().nullable().optional(),
  contactPhone:   z.string().nullable().optional(),
  contactEmail:   z.string().nullable().optional(),
  contactAddress: z.string().nullable().optional(),
  galleries:      z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  downloads:      z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  articles:       z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  translations:   z.array(translationSchema).min(1),
});

export async function GET(req) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get('search') ?? '';
  const status   = searchParams.get('status') ?? '';
  const template = searchParams.get('template') ?? '';
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage  = Math.min(100, parseInt(searchParams.get('perPage') ?? '20', 10));
  const sortBy   = searchParams.get('sortBy') ?? 'sortOrder';
  const sortDir  = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';

  const allowedSortFields = ['sortOrder', 'createdAt', 'updatedAt', 'status', 'template'];
  const orderField = allowedSortFields.includes(sortBy) ? sortBy : 'sortOrder';

  const where = {
    ...(status   ? { status }   : {}),
    ...(template ? { template } : {}),
    ...(search   ? { translations: { some: { title: { contains: search } } } } : {}),
  };

  const [pages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      orderBy: { [orderField]: sortDir },
      skip:  (page - 1) * perPage,
      take:  perPage,
      select: {
        id: true, slug: true, template: true, status: true,
        sortOrder: true, visibility: true, createdAt: true, updatedAt: true,
        translations: { select: { locale: true, title: true } },
      },
    }),
    prisma.page.count({ where }),
  ]);

  return Response.json({ success: true, data: { pages, total, page, perPage } });
}

export async function POST(req) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;

  const defaultTranslation = d.translations[0];
  let slug = session.user.role === 'ADMIN' && d.slug
    ? d.slug.trim()
    : slugify(defaultTranslation.title);

  if (!slug) slug = 'page';

  let candidate = slug;
  let suffix = 2;
  while (await prisma.page.findUnique({ where: { slug: candidate } })) {
    candidate = `${slug}-${suffix++}`;
  }

  const page = await prisma.page.create({
    data: {
      slug:           candidate,
      template:       d.template,
      status:         d.status,
      sortOrder:      d.sortOrder,
      visibility:     d.visibility,
      restrictedRole: d.restrictedRole ?? null,
      featuredImage:  d.featuredImage  ?? null,
      mapEmbedUrl:    d.mapEmbedUrl    ?? null,
      contactPhone:   d.contactPhone   ?? null,
      contactEmail:   d.contactEmail   ?? null,
      contactAddress: d.contactAddress ?? null,
      translations: {
        create: d.translations.map((t) => ({
          locale: t.locale, title: t.title, summary: t.summary,
          content: t.content, metaTitle: t.metaTitle, metaDescription: t.metaDescription,
        })),
      },
    },
    include: { translations: true },
  });

  if (d.galleries.length || d.downloads.length || d.articles.length) {
    await prisma.$transaction([
      ...d.galleries.map(({ id, sortOrder }) =>
        prisma.pageGallery.create({ data: { pageId: page.id, galleryId: id, sortOrder } })
      ),
      ...d.downloads.map(({ id, sortOrder }) =>
        prisma.pageDownload.create({ data: { pageId: page.id, downloadId: id, sortOrder } })
      ),
      ...d.articles.map(({ id, sortOrder }) =>
        prisma.pageArticle.create({ data: { pageId: page.id, articleId: id, sortOrder } })
      ),
    ]);
  }

  return Response.json({ success: true, data: page }, { status: 201 });
}
