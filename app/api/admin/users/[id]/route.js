import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { canCreateRole } from '@/lib/permissions';

const updateSchema = z.object({
  name: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'MODERATOR']),
});

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

  if (!canCreateRole(session, parsed.data.role)) {
    return Response.json({ success: false, error: 'Insufficient permissions to assign this role' }, { status: 403 });
  }

  // Prevent demoting yourself
  if (parseInt(session.user.id, 10) === id && parsed.data.role !== 'ADMIN' && session.user.role === 'ADMIN') {
    return Response.json({ success: false, error: 'You cannot demote your own account' }, { status: 400 });
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data:  { name: parsed.data.name ?? null, role: parsed.data.role },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });

  return Response.json({ success: true, data: user });
}

export async function DELETE(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (session.user.role !== 'ADMIN') {
    return Response.json({ success: false, error: 'ADMIN role required' }, { status: 403 });
  }

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);

  if (parseInt(session.user.id, 10) === id) {
    return Response.json({ success: false, error: 'You cannot delete your own account' }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { id } });
  return Response.json({ success: true });
}
