import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

const schema = z.object({
  status: z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN']),
});

export async function PATCH(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Invalid status' }, { status: 400 });
  }

  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  const article = await prisma.article.update({
    where: { id },
    data:  { status: parsed.data.status },
    select: { id: true, status: true },
  });

  return Response.json({ success: true, data: article });
}
