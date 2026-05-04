import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminRole } from '@/lib/apiAuth';

const schema = z.object({
  site_name:                    z.string().min(1, 'Site name is required'),
  contact_email:                z.string().email().or(z.literal('')),
  default_locale:               z.string().min(2).max(10),
  active_locales:               z.array(z.string().min(2).max(10)).min(1),
  registration_enabled:         z.boolean(),
  register_salutation_enabled:  z.boolean(),
  register_phone_enabled:       z.boolean(),
  register_company_enabled:     z.boolean(),
  maintenance_mode:             z.boolean(),
  mail_provider:                z.enum(['gmail', 'graph']),
  breadcrumb_enabled:           z.boolean(),
  mobile_nav_style:             z.enum(['accordion', 'offcanvas']),
});

export async function GET() {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  const rows = await prisma.setting.findMany();
  const data = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return Response.json({ success: true, data });
}

export async function POST(req) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.active_locales && body.default_locale && !body.active_locales.includes(body.default_locale)) {
    return Response.json({ success: false, error: 'Default locale must be in active locales' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ success: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const d = parsed.data;
  const updates = [
    { key: 'site_name',                    value: d.site_name },
    { key: 'contact_email',                value: d.contact_email },
    { key: 'default_locale',               value: d.default_locale },
    { key: 'active_locales',               value: JSON.stringify(d.active_locales) },
    { key: 'registration_enabled',         value: String(d.registration_enabled) },
    { key: 'register_salutation_enabled',  value: String(d.register_salutation_enabled) },
    { key: 'register_phone_enabled',       value: String(d.register_phone_enabled) },
    { key: 'register_company_enabled',     value: String(d.register_company_enabled) },
    { key: 'maintenance_mode',             value: String(d.maintenance_mode) },
    { key: 'mail_provider',                value: d.mail_provider },
    { key: 'breadcrumb_enabled',           value: String(d.breadcrumb_enabled) },
    { key: 'mobile_nav_style',             value: d.mobile_nav_style },
  ];

  await prisma.$transaction(
    updates.map(({ key, value }) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );

  return Response.json({ success: true });
}
