import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { deleteUpload } from '@/lib/upload';

const translationSchema = z.object({
  locale:      z.string().min(2).max(10),
  title:       z.string().min(1),
  description: z.string().optional().default(''),
});

const updateSchema = z.object({
  filename:     z.string().min(1),
  originalName: z.string().min(1),
  fileType:     z.string().min(1),
  fileSize:     z.number().int().positive(),
  translations: z.array(translationSchema).min(1),
});

export async function GET(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  const download = await prisma.download.findUnique({
    where: { id },
    include: { translations: true },
  });

  if (!download) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  return Response.json({ success: true, data: download });
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

  const existing = await prisma.download.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  const d = parsed.data;

  // Delete old file if it was replaced
  if (d.filename !== existing.filename) {
    await deleteUpload(existing.filename);
  }

  const download = await prisma.download.update({
    where: { id },
    data: {
      filename:     d.filename,
      originalName: d.originalName,
      fileType:     d.fileType,
      fileSize:     d.fileSize,
      translations: {
        deleteMany: {},
        create: d.translations.map((t) => ({
          locale:      t.locale,
          title:       t.title,
          description: t.description,
        })),
      },
    },
    include: { translations: true },
  });

  return Response.json({ success: true, data: download });
}

export async function DELETE(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (session.user.role !== 'ADMIN') {
    return Response.json({ success: false, error: 'ADMIN role required' }, { status: 403 });
  }

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  const existing = await prisma.download.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  await deleteUpload(existing.filename);
  await prisma.download.delete({ where: { id } });

  return Response.json({ success: true });
}
