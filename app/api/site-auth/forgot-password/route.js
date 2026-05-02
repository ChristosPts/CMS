import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/mail';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email) {
    return Response.json({ success: false, error: 'Email is required' }, { status: 400 });
  }

  // Always return success to prevent user enumeration
  const user = await prisma.publicUser.findUnique({ where: { email } });

  if (user && user.emailVerified) {
    const token  = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.publicUser.update({
      where: { id: user.id },
      data:  { resetToken: token, resetTokenExp: expiry },
    });

    const siteSetting = await prisma.setting.findUnique({ where: { key: 'site_name' } });
    const siteName    = siteSetting?.value || 'Site';
    const baseUrl     = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    try {
      await sendPasswordResetEmail(email, token, siteName, baseUrl);
    } catch (err) {
      console.error('[forgot-password] Failed to send reset email:', err);
    }
  }

  return Response.json({ success: true });
}
