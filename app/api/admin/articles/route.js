import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { getDefaultLocale } from '@/lib/settings';
import { articleSlug } from '@/lib/slugify';

const translationSchema = z.object({
  locale:          z.string().min(2).max(10),
  title:           z.string().default(''),
  summary:         z.string().optional().default(''),
  content:         z.string().optional().default(''),
  metaTitle:       z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
});

const createSchema = z.object({
  parentPageId:   z.number().int(),
  status:         z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN']).default('DRAFT'),
  visibility:     z.enum(['PUBLIC', 'AUTHENTICATED_ONLY', 'ROLE_RESTRICTED']).default('PUBLIC'),
  restrictedRole: z.string().nullable().optional(),
  featuredImage:  z.string().nullable().optional(),
  publishDate:    z.string().nullable().optional(),
  galleries:      z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  downloads:      z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  translations:   z.array(translationSchema).min(1),
});

export async function GET(req) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const parentPageId = parseInt(searchParams.get('parentPageId') ?? '0', 10);
  const search       = searchParams.get('search') ?? '';
  const status       = searchParams.get('status') ?? '';
  const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage      = Math.min(100, parseInt(searchParams.get('perPage') ?? '20', 10));
  const sortBy       = searchParams.get('sortBy') ?? 'publishDate';
  const sortDir      = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

  const allowedSort = ['publishDate', 'createdAt', 'updatedAt', 'status'];
  const orderField  = allowedSort.includes(sortBy) ? sortBy : 'publishDate';

  const where = {
    ...(parentPageId ? { parentPageId } : {}),
    ...(status       ? { status }       : {}),
    ...(search ? { translations: { some: { title: { contains: search } } } } : {}),
  };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, slug: true, status: true, visibility: true,
        featuredImage: true, publishDate: true, createdAt: true, updatedAt: true,
        author: { select: { id: true, name: true, username: true } },
        translations: { select: { locale: true, title: true } },
      },
    }),
    prisma.article.count({ where }),
  ]);

  return Response.json({ success: true, data: { articles, total, page, perPage } });
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

  // Verify parent page exists and is ARTICLE_LIST
  const parentPage = await prisma.page.findFirst({
    where: { id: d.parentPageId, template: 'ARTICLE_LIST' },
  });
  if (!parentPage) {
    return Response.json({ success: false, error: 'Parent page not found or not ARTICLE_LIST' }, { status: 400 });
  }

  const defaultLocale = await getDefaultLocale();
  const defaultTitle  = d.translations.find((t) => t.locale === defaultLocale)?.title
    || d.translations[0]?.title
    || '';

  // Create with placeholder slug, then update with real slug containing the ID
  const article = await prisma.article.create({
    data: {
      slug:           'temp',
      status:         d.status,
      visibility:     d.visibility,
      restrictedRole: d.restrictedRole ?? null,
      featuredImage:  d.featuredImage ?? null,
      publishDate:    d.publishDate ? new Date(d.publishDate) : null,
      authorId:       parseInt(session.user.id, 10),
      parentPageId:   d.parentPageId,
      translations: {
        create: d.translations.map((t) => ({
          locale: t.locale, title: t.title, summary: t.summary,
          content: t.content, metaTitle: t.metaTitle, metaDescription: t.metaDescription,
        })),
      },
    },
    include: { translations: true },
  });

  // Update slug to {id}-{slugified-title}
  const slug = articleSlug(article.id, defaultTitle);
  const updated = await prisma.article.update({
    where: { id: article.id },
    data:  { slug },
    include: { translations: true },
  });

  // Sync connections
  if (d.galleries.length || d.downloads.length) {
    await prisma.$transaction([
      ...d.galleries.map(({ id: galleryId, sortOrder }) =>
        prisma.articleGallery.create({ data: { articleId: article.id, galleryId, sortOrder } })
      ),
      ...d.downloads.map(({ id: downloadId, sortOrder }) =>
        prisma.articleDownload.create({ data: { articleId: article.id, downloadId, sortOrder } })
      ),
    ]);
  }

  return Response.json({ success: true, data: updated }, { status: 201 });
}
