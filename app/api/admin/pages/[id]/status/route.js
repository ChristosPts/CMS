import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

const schema = z.object({
  status: z.enum(['PUBLISHED', 'DRAFT', 'HIDDEN']),
});

export async function PATCH(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
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

  // MODERATOR can only hide (not permanently delete, and can publish their own content)
  // Status change is allowed for both roles; DELETE is ADMIN only
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  const page = await prisma.page.update({
    where: { id },
    data:  { status: parsed.data.status },
    select: { id: true, status: true },
  });

  return Response.json({ success: true, data: page });
}
