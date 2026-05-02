import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

const translationSchema = z.object({
  locale:      z.string().min(2).max(10),
  title:       z.string().min(1),
  description: z.string().optional().default(''),
});

const createSchema = z.object({
  filename:     z.string().min(1),
  originalName: z.string().min(1),
  fileType:     z.string().min(1),
  fileSize:     z.number().int().positive(),
  translations: z.array(translationSchema).min(1),
});

export async function GET(req) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const search  = searchParams.get('search') ?? '';
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(100, parseInt(searchParams.get('perPage') ?? '20', 10));

  const where = search
    ? { translations: { some: { title: { contains: search } } } }
    : {};

  const [downloads, total] = await Promise.all([
    prisma.download.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { translations: true },
    }),
    prisma.download.count({ where }),
  ]);

  return Response.json({ success: true, data: { downloads, total, page, perPage } });
}

export async function POST(req) {
  const { errorResponse } = await requireAdminSession();
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
  const download = await prisma.download.create({
    data: {
      filename:     d.filename,
      originalName: d.originalName,
      fileType:     d.fileType,
      fileSize:     d.fileSize,
      translations: {
        create: d.translations.map((t) => ({
          locale:      t.locale,
          title:       t.title,
          description: t.description,
        })),
      },
    },
    include: { translations: true },
  });

  return Response.json({ success: true, data: download }, { status: 201 });
}
