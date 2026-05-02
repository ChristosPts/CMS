import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminSession } from '@/lib/apiAuth';
import { deleteUpload } from '@/lib/upload';

export async function GET(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!gallery) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
  return Response.json({ success: true, data: gallery });
}

export async function PUT(req, { params }) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const title = String(body.title ?? '').trim();
  if (!title) return Response.json({ success: false, error: 'Title required' }, { status: 400 });

  const gallery = await prisma.gallery.update({ where: { id }, data: { title } });
  return Response.json({ success: true, data: gallery });
}

export async function DELETE(req, { params }) {
  const { session, errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  if (session.user.role !== 'ADMIN') {
    return Response.json({ success: false, error: 'ADMIN role required' }, { status: 403 });
  }

    const { id: rawId } = await params; 
  const id = parseInt(rawId, 10);
  const gallery = await prisma.gallery.findUnique({
    where: { id },
    include: { images: { select: { filename: true } } },
  });
  if (!gallery) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

  // Delete physical files
  await Promise.all(gallery.images.map((img) => deleteUpload(img.filename)));

  await prisma.gallery.delete({ where: { id } });
  return Response.json({ success: true });
}
