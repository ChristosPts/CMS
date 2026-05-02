import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { slugify } from '@/lib/slugify';
import { deleteUpload } from '@/lib/upload';

const translationSchema = z.object({
  locale:          z.string().min(2).max(10),
  title:           z.string().default(''),
  summary:         z.string().optional().default(''),
  content:         z.string().optional().default(''),
  metaTitle:       z.string().optional().default(''),
  metaDescription: z.string().optional().default(''),
});

const updateSchema = z.object({
  template:       z.enum(['BASIC', 'GRID', 'ARTICLE_LIST', 'ARTICLE_SINGLE', 'CONTACT', 'HOME']),
  status:         z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN']),
  sortOrder:      z.number().int(),
  parentId:       z.number().int().nullable().optional(),
  visibility:     z.enum(['PUBLIC', 'AUTHENTICATED_ONLY', 'ROLE_RESTRICTED']),
  restrictedRole: z.string().optional().nullable(),
  slug:           z.string().optional(),
  featuredImage:  z.string().nullable().optional(),
  galleries:      z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  downloads:      z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  articles:       z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).optional().default([]),
  gridItems:      z.array(z.object({
    id:           z.number().int().nullable().optional(),
    image:        z.string().nullable().optional(),
    sortOrder:    z.number().int(),
    translations: z.array(z.object({
      locale:      z.string().min(2).max(10),
      name:        z.string().default(''),
      subtitle:    z.string().optional().default(''),
      description: z.string().optional().default(''),
    })),
  })).optional().default([]),
  translations:   z.array(translationSchema).min(1),
});

export async function GET(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  const page = await prisma.page.findUnique({
    where: { id },
    include: { translations: true },
  });

  if (!page) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  return Response.json({ success: true, data: page });
}

export async function PUT(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
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

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  const d = parsed.data;
  let newSlug = existing.slug;

  // Only ADMIN can change slug
  if (session.user.role === 'ADMIN' && d.slug && d.slug.trim() !== existing.slug) {
    let candidate = slugify(d.slug.trim()) || existing.slug;
    let suffix = 2;
    while (true) {
      const conflict = await prisma.page.findUnique({ where: { slug: candidate } });
      if (!conflict || conflict.id === id) break;
      candidate = `${slugify(d.slug.trim())}-${suffix++}`;
    }
    newSlug = candidate;
  }

  // Upsert translations
  const page = await prisma.page.update({
    where: { id },
    data: {
      slug:           newSlug,
      template:       d.template,
      status:         d.status,
      sortOrder:      d.sortOrder,
      parentId:       d.parentId ?? null,
      visibility:     d.visibility,
      restrictedRole: d.restrictedRole ?? null,
      featuredImage:  d.featuredImage !== undefined ? d.featuredImage : existing.featuredImage,
      translations: {
        deleteMany: {},
        create: d.translations.map((t) => ({
          locale:          t.locale,
          title:           t.title,
          summary:         t.summary ?? '',
          content:         t.content ?? '',
          metaTitle:       t.metaTitle ?? '',
          metaDescription: t.metaDescription ?? '',
        })),
      },
    },
    include: { translations: true },
  });

  // Sync grid items (GRID template)
  if (d.template === 'GRID') {
    const existingItems = await prisma.gridItem.findMany({ where: { pageId: id } });
    const existingIds   = new Set(existingItems.map((i) => i.id));
    const incomingIds   = new Set(d.gridItems.filter((i) => i.id).map((i) => i.id));

    // Delete orphaned items (and their images)
    const toDelete = existingItems.filter((i) => !incomingIds.has(i.id));
    for (const item of toDelete) {
      if (item.image) await deleteUpload(item.image);
    }
    if (toDelete.length) {
      await prisma.gridItem.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } });
    }

    // Upsert remaining items
    for (const item of d.gridItems) {
      const transData = item.translations.map((t) => ({
        locale: t.locale, name: t.name, subtitle: t.subtitle, description: t.description,
      }));

      if (item.id && existingIds.has(item.id)) {
        await prisma.gridItem.update({
          where: { id: item.id },
          data: {
            image:     item.image ?? null,
            sortOrder: item.sortOrder,
            translations: { deleteMany: {}, create: transData },
          },
        });
      } else {
        await prisma.gridItem.create({
          data: {
            pageId:    id,
            image:     item.image ?? null,
            sortOrder: item.sortOrder,
            translations: { create: transData },
          },
        });
      }
    }
  }

  // Sync connections — delete all then re-create in sorted order
  await prisma.$transaction([
    prisma.pageGallery.deleteMany({ where: { pageId: id } }),
    prisma.pageDownload.deleteMany({ where: { pageId: id } }),
    prisma.pageArticle.deleteMany({ where: { pageId: id } }),
    ...d.galleries.map(({ id: galleryId, sortOrder }) =>
      prisma.pageGallery.create({ data: { pageId: id, galleryId, sortOrder } })
    ),
    ...d.downloads.map(({ id: downloadId, sortOrder }) =>
      prisma.pageDownload.create({ data: { pageId: id, downloadId, sortOrder } })
    ),
    ...d.articles.map(({ id: articleId, sortOrder }) =>
      prisma.pageArticle.create({ data: { pageId: id, articleId, sortOrder } })
    ),
  ]);

  return Response.json({ success: true, data: page });
}

export async function DELETE(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (session.user.role !== 'ADMIN') {
    return Response.json({ success: false, error: 'ADMIN role required to delete' }, { status: 403 });
  }

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  await prisma.page.delete({ where: { id } });

  return Response.json({ success: true });
}
