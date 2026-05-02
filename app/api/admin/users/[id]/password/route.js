import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

const schema = z.object({
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

export async function PUT(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);

  // Only ADMIN can reset any password; MODERATOR can only reset their own
  if (session.user.role !== 'ADMIN' && parseInt(session.user.id, 10) !== id) {
    return Response.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  await prisma.adminUser.update({ where: { id }, data: { password: hashed } });

  return Response.json({ success: true });
}
