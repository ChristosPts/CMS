import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

const schema = z.object({
  token:           z.string().min(1),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const user = await prisma.publicUser.findFirst({
    where: {
      resetToken:    token,
      resetTokenExp: { gt: new Date() },
    },
  });

  if (!user) {
    return Response.json(
      { success: false, error: 'Reset link is invalid or has expired.' },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.publicUser.update({
    where: { id: user.id },
    data: {
      password:     hashed,
      resetToken:    null,
      resetTokenExp: null,
    },
  });

  return Response.json({ success: true });
}
