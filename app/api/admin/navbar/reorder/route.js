import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminRole } from '@/lib/apiAuth';

const schema = z.object({
  items: z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })).min(1),
});

export async function PUT(req) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Invalid data' }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.items.map(({ id, sortOrder }) =>
      prisma.navbarItem.update({ where: { id }, data: { sortOrder } })
    )
  );

  return Response.json({ success: true });
}
