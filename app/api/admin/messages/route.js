import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

export async function GET(req) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const filter  = searchParams.get('filter') ?? 'all'; // 'all' | 'unread'
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = 20;

  const where = filter === 'unread' ? { read: false } : {};

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        sourcePage: {
          select: {
            slug: true,
            translations: { take: 1, select: { title: true } },
          },
        },
      },
    }),
    prisma.message.count({ where }),
  ]);

  return Response.json({ success: true, data: { messages, total, page, perPage } });
}
