import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';

const updateSchema = z.object({
  name:          z.string().optional().nullable(),
  publicRole:    z.string().optional().nullable(),
  emailVerified: z.boolean().optional(),
});

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

  const user = await prisma.publicUser.update({
    where: { id },
    data:  {
      ...(parsed.data.name          !== undefined ? { name: parsed.data.name ?? null } : {}),
      ...(parsed.data.publicRole    !== undefined ? { publicRole: parsed.data.publicRole ?? null } : {}),
      ...(parsed.data.emailVerified !== undefined ? { emailVerified: parsed.data.emailVerified } : {}),
    },
    select: { id: true, email: true, name: true, publicRole: true, emailVerified: true, createdAt: true },
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
  await prisma.publicUser.delete({ where: { id } });
  return Response.json({ success: true });
}
