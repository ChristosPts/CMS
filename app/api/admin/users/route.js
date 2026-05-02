import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { canCreateRole } from '@/lib/permissions';

const createSchema = z.object({
  username:        z.string().min(3).max(50).regex(/^\w+$/, 'Username can only contain letters, numbers, and underscores'),
  name:            z.string().optional(),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role:            z.enum(['ADMIN', 'MODERATOR']),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

export async function GET() {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
    select:  { id: true, username: true, name: true, role: true, createdAt: true },
  });

  return Response.json({ success: true, data: users });
}

export async function POST(req) {
  const { session, errorResponse } = await requireAdminSession();
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

  if (!canCreateRole(session, d.role)) {
    return Response.json({ success: false, error: 'Insufficient permissions to create this role' }, { status: 403 });
  }

  const existing = await prisma.adminUser.findUnique({ where: { username: d.username } });
  if (existing) {
    return Response.json({ success: false, error: { username: ['Username already taken'] } }, { status: 409 });
  }

  const hashed = await bcrypt.hash(d.password, 12);
  const user   = await prisma.adminUser.create({
    data: {
      username: d.username,
      name:     d.name || null,
      password: hashed,
      role:     d.role,
    },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });

  return Response.json({ success: true, data: user }, { status: 201 });
}
