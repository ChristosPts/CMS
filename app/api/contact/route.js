import prisma from '@/lib/prisma';
import { sendContactNotification } from '@/lib/mail';

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { pageId, fields = {}, trap } = body;

  // Honeypot — silently accept so bots don't retry
  if (trap) return Response.json({ success: true });

  // Load the page's form field definitions
  const fieldDefs = pageId
    ? await prisma.formField.findMany({ where: { pageId: Number(pageId) }, orderBy: { sortOrder: 'asc' } })
    : [];

  const usingDefaults = fieldDefs.length === 0;
  let name    = '';
  let email   = '';
  let subject = '';
  let msgBody = '';
  const extraData = {};
  const validationErrors = {};

  if (usingDefaults) {
    name    = String(fields['d1'] ?? '').trim();
    email   = String(fields['d2'] ?? '').trim();
    subject = String(fields['d3'] ?? '').trim();
    msgBody = String(fields['d4'] ?? '').trim();

    if (!name)    validationErrors['d1'] = ['Name is required'];
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validationErrors['d2'] = ['Valid email is required'];
    if (!subject) validationErrors['d3'] = ['Subject is required'];
    if (msgBody.length < 2) validationErrors['d4'] = ['Message is required'];
  } else {
    for (const fd of fieldDefs) {
      const key   = String(fd.id);
      const val   = fields[key];
      const label = Object.values(fd.labelJson ?? {})[0] ?? fd.type;
      const strVal = fd.type === 'CHECKBOX' ? Boolean(val) : String(val ?? '').trim();

      if (fd.required) {
        const empty = fd.type === 'CHECKBOX' ? !val : !strVal;
        if (empty) { validationErrors[key] = [`${label} is required`]; continue; }
      }

      if (fd.type === 'EMAIL' && strVal) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(strVal))) {
          validationErrors[key] = ['Please enter a valid email address']; continue;
        }
      }

      // Map to standard columns by type + label heuristic
      if (fd.type === 'EMAIL' && !email) email = String(strVal);
      if (fd.type === 'TEXT'  && !name  && String(label).toLowerCase().includes('name')) name = String(strVal);
      if (fd.type === 'TEXTAREA' && !msgBody) msgBody = String(strVal);

      extraData[label] = strVal;
    }

    if (!email) {
      return Response.json({ success: false, error: 'A valid email field is required.' }, { status: 400 });
    }

    if (!subject) {
      const sf = fieldDefs.find((fd) =>
        fd.type === 'TEXT' && !String(Object.values(fd.labelJson ?? {})[0] ?? '').toLowerCase().includes('name')
      );
      if (sf) subject = String(fields[String(sf.id)] ?? '').trim();
    }
  }

  if (Object.keys(validationErrors).length > 0) {
    return Response.json({ success: false, error: validationErrors }, { status: 400 });
  }

  await prisma.message.create({
    data: {
      name:        name || 'Unknown',
      email,
      subject:     subject || '(no subject)',
      body:        msgBody || '',
      extraData:   Object.keys(extraData).length ? extraData : null,
      sourcePageId: pageId ? Number(pageId) : null,
      read:        false,
    },
  });

  try {
    const [contactSetting, siteSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'contact_email' } }),
      prisma.setting.findUnique({ where: { key: 'site_name' } }),
    ]);
    const contactEmail = contactSetting?.value;
    const siteName     = siteSetting?.value || 'Site';

    if (contactEmail) {
      await sendContactNotification({
        to:      contactEmail,
        from:    { name: name || email, email },
        subject: subject || '(no subject)',
        message: msgBody || JSON.stringify(extraData, null, 2),
        siteName,
      });
    }
  } catch (err) {
    console.error('[contact] Failed to send notification email:', err);
  }

  return Response.json({ success: true });
}
