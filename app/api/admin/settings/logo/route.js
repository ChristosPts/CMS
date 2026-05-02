import prisma from '@/lib/prisma';
import { requireAdminRole } from '@/lib/apiAuth';

export async function POST(req) {
  const { errorResponse } = await requireAdminRole();
  if (errorResponse) return errorResponse;

  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const logo = String(body.logo ?? '');

  await prisma.setting.upsert({
    where:  { key: 'logo' },
    update: { value: logo },
    create: { key: 'logo', value: logo },
  });

  return Response.json({ success: true });
}
