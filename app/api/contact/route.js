import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendContactNotification } from '@/lib/mail';

const schema = z.object({
  name:    z.string().min(1, 'Name is required'),
  email:   z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  pageId:  z.number().int().optional().nullable(),
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

  const { name, email, subject, message, pageId } = parsed.data;

  // Save to database — this must succeed
  await prisma.message.create({
    data: {
      name,
      email,
      subject,
      body:        message,
      sourcePageId: pageId ?? null,
      read:        false,
    },
  });

  // Send notification email — failure is non-fatal
  try {
    const [contactSetting, siteSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'contact_email' } }),
      prisma.setting.findUnique({ where: { key: 'site_name' } }),
    ]);

    const contactEmail = contactSetting?.value;
    const siteName     = siteSetting?.value || 'Site';

    if (contactEmail) {
      await sendContactNotification({
        to:       contactEmail,
        from:     { name, email },
        subject,
        message,
        siteName,
      });
    }
  } catch (err) {
    console.error('[contact] Failed to send notification email:', err);
  }

  return Response.json({ success: true });
}
