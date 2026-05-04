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

const formFieldSchema = z.object({
  id:        z.number().int().nullable().optional(),
  type:      z.enum(['TEXT', 'EMAIL', 'PHONE', 'TEXTAREA', 'SELECT', 'CHECKBOX']),
  labelJson: z.record(z.string()),
  required:  z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  options:   z.array(z.object({ value: z.string(), label: z.string() })).nullable().optional(),
  width:     z.enum(['full', 'half']).default('full'),
});

const updateSchema = z.object({
  template:       z.enum(['BASIC', 'GRID', 'ARTICLE_LIST', 'ARTICLE_SINGLE', 'CONTACT', 'HOME']),
  status:         z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN']),
  sortOrder:      z.number().int(),
  visibility:     z.enum(['PUBLIC', 'AUTHENTICATED_ONLY', 'ROLE_RESTRICTED']),
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
  formFields:     z.array(formFieldSchema).optional().default([]),
  viewStyle:      z.enum(['GRID', 'LIST']).optional().default('GRID'),
  gridItems:      z.array(z.object({
    id:           z.number().int().nullable().optional(),
    image:        z.string().nullable().optional(),
    linkUrl:      z.string().nullable().optional(),
    openInNewTab: z.boolean().optional().default(false),
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

  const page = await prisma.page.update({
    where: { id },
    data: {
      slug:           newSlug,
      template:       d.template,
      status:         d.status,
      sortOrder:      d.sortOrder,
      visibility:     d.visibility,
      restrictedRole: d.restrictedRole ?? null,
      featuredImage:  d.featuredImage !== undefined ? d.featuredImage : existing.featuredImage,
      mapEmbedUrl:    d.mapEmbedUrl    ?? null,
      contactPhone:   d.contactPhone   ?? null,
      contactEmail:   d.contactEmail   ?? null,
      contactAddress: d.contactAddress ?? null,
      viewStyle:      d.viewStyle      ?? 'GRID',
      translations: {
        deleteMany: {},
        create: d.translations.map((t) => ({
          locale: t.locale, title: t.title, summary: t.summary ?? '',
          content: t.content ?? '', metaTitle: t.metaTitle ?? '', metaDescription: t.metaDescription ?? '',
        })),
      },
    },
    include: { translations: true },
  });

  // Sync grid items
  if (d.template === 'GRID') {
    const existingItems = await prisma.gridItem.findMany({ where: { pageId: id } });
    const existingIds   = new Set(existingItems.map((i) => i.id));
    const incomingIds   = new Set(d.gridItems.filter((i) => i.id).map((i) => i.id));

    const toDelete = existingItems.filter((i) => !incomingIds.has(i.id));
    for (const item of toDelete) {
      if (item.image) await deleteUpload(item.image);
    }
    if (toDelete.length) {
      await prisma.gridItem.deleteMany({ where: { id: { in: toDelete.map((i) => i.id) } } });
    }

    for (const item of d.gridItems) {
      const transData = item.translations.map((t) => ({
        locale: t.locale, name: t.name, subtitle: t.subtitle, description: t.description,
      }));
      if (item.id && existingIds.has(item.id)) {
        await prisma.gridItem.update({
          where: { id: item.id },
          data: { image: item.image ?? null, linkUrl: item.linkUrl ?? null, openInNewTab: item.openInNewTab ?? false, sortOrder: item.sortOrder, translations: { deleteMany: {}, create: transData } },
        });
      } else {
        await prisma.gridItem.create({
          data: { pageId: id, image: item.image ?? null, linkUrl: item.linkUrl ?? null, openInNewTab: item.openInNewTab ?? false, sortOrder: item.sortOrder, translations: { create: transData } },
        });
      }
    }
  }

  // Sync form fields (CONTACT template)
  if (d.template === 'CONTACT') {
    const existingFields = await prisma.formField.findMany({ where: { pageId: id } });
    const existingIds    = new Set(existingFields.map((f) => f.id));
    const incomingIds    = new Set(d.formFields.filter((f) => f.id).map((f) => f.id));

    await prisma.formField.deleteMany({
      where: { pageId: id, id: { notIn: [...incomingIds].filter(Boolean) } },
    });

    for (const field of d.formFields) {
      const data = {
        type:      field.type,
        labelJson: field.labelJson,
        required:  field.required,
        sortOrder: field.sortOrder,
        options:   field.options ?? null,
        width:     field.width,
      };
      if (field.id && existingIds.has(field.id)) {
        await prisma.formField.update({ where: { id: field.id }, data });
      } else {
        await prisma.formField.create({ data: { ...data, pageId: id } });
      }
    }
  }

  // Sync connections
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
