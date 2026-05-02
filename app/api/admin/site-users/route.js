import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

export async function GET(req) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const { searchParams } = new URL(req.url);
  const search  = searchParams.get('search') ?? '';
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = 20;

  const where = search
    ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.publicUser.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true, email: true, name: true, publicRole: true,
        emailVerified: true, createdAt: true,
      },
    }),
    prisma.publicUser.count({ where }),
  ]);

  return Response.json({ success: true, data: { users, total, page, perPage } });
}
