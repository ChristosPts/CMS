import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

const patchSchema = z.object({
  read: z.boolean(),
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Invalid data' }, { status: 400 });
  }

  const message = await prisma.message.update({
    where: { id },
    data:  { read: parsed.data.read },
    select: { id: true, read: true },
  });

  return Response.json({ success: true, data: message });
}

export async function DELETE(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (session.user.role !== 'ADMIN') {
    return Response.json({ success: false, error: 'ADMIN role required' }, { status: 403 });
  }

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  await prisma.message.delete({ where: { id } });

  return Response.json({ success: true });
}
