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

const updateSchema = z.object({
  status:         z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN']),
  visibility:     z.enum(['PUBLIC', 'AUTHENTICATED_ONLY', 'ROLE_RESTRICTED']),
  restrictedRole: z.string().nullable().optional(),
  featuredImage:  z.string().nullable().optional(),
  publishDate:    z.string().nullable().optional(),
  categories:     z.array(z.number().int()).optional().default([]),
  galleries:      z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  downloads:      z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  translations:   z.array(translationSchema).min(1),
});

export async function GET(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      translations: true,
      author: { select: { id: true, name: true, username: true } },
    },
  });

  if (!article) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  return Response.json({ success: true, data: article });
}

export async function PUT(req, { params }) {
  const { errorResponse } = await requireAdminSession();
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

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  const d = parsed.data;
  const defaultLocale = await getDefaultLocale();
  const defaultTitle  = d.translations.find((t) => t.locale === defaultLocale)?.title
    || d.translations[0]?.title
    || '';

  // Regenerate slug whenever title changes
  const slug = articleSlug(id, defaultTitle);

  const article = await prisma.article.update({
    where: { id },
    data: {
      slug,
      status:         d.status,
      visibility:     d.visibility,
      restrictedRole: d.restrictedRole ?? null,
      featuredImage:  d.featuredImage !== undefined ? d.featuredImage : existing.featuredImage,
      publishDate:    d.publishDate ? new Date(d.publishDate) : null,
      translations: {
        deleteMany: {},
        create: d.translations.map((t) => ({
          locale: t.locale, title: t.title, summary: t.summary,
          content: t.content, metaTitle: t.metaTitle, metaDescription: t.metaDescription,
        })),
      },
    },
    include: { translations: true },
  });

  // Sync connections + categories
  await prisma.$transaction([
    prisma.articleGallery.deleteMany({ where: { articleId: id } }),
    prisma.articleDownload.deleteMany({ where: { articleId: id } }),
    prisma.articleToCategory.deleteMany({ where: { articleId: id } }),
    ...d.galleries.map(({ id: galleryId, sortOrder }) =>
      prisma.articleGallery.create({ data: { articleId: id, galleryId, sortOrder } })
    ),
    ...d.downloads.map(({ id: downloadId, sortOrder }) =>
      prisma.articleDownload.create({ data: { articleId: id, downloadId, sortOrder } })
    ),
    ...(d.categories ?? []).map((categoryId) =>
      prisma.articleToCategory.create({ data: { articleId: id, categoryId } })
    ),
  ]);

  return Response.json({ success: true, data: article });
}

export async function DELETE(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (session.user.role !== 'ADMIN') {
    return Response.json({ success: false, error: 'ADMIN role required to delete' }, { status: 403 });
  }

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  await prisma.article.delete({ where: { id } });
  return Response.json({ success: true });
}
