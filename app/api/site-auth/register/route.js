import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/mail';

const schema = z.object({
  name:            z.string().optional(),
  email:           z.string().email('Invalid email address'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  salutation:      z.string().optional(),
  phone:           z.string().optional(),
  company:         z.string().optional(),
  trap:            z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
});

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Honeypot — silently succeed
  if (body.trap) return Response.json({ success: true });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const regSetting = await prisma.setting.findUnique({ where: { key: 'registration_enabled' } });
  if (regSetting?.value === 'false') {
    return Response.json({ success: false, error: 'Registration is currently disabled.' }, { status: 403 });
  }

  const { name, email, password, salutation, phone, company } = parsed.data;

  const existing = await prisma.publicUser.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ success: true });
  }

  const hashed = await bcrypt.hash(password, 12);
  const token  = uuidv4();

  await prisma.publicUser.create({
    data: {
      email,
      password:     hashed,
      name:         name      || null,
      salutation:   salutation || null,
      phone:        phone      || null,
      company:      company    || null,
      emailVerified: false,
      verifyToken:  token,
    },
  });

  const [siteSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key: 'site_name' } }),
  ]);
  const siteName = siteSetting?.value || 'Site';
  const baseUrl  = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  try {
    await sendVerificationEmail(email, token, siteName, baseUrl);
  } catch (err) {
    console.error('[register] Failed to send verification email:', err);
  }

  return Response.json({ success: true });
}
