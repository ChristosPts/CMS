import { requireAdminSession } from '@/lib/apiAuth';
import { processImage, processDocument } from '@/lib/upload';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
const DOC_TYPES   = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

export async function POST(req) {
  const { errorResponse } = await requireAdminSession();
  if (errorResponse) return errorResponse;

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ success: false, error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return Response.json({ success: false, error: 'No file provided' }, { status: 400 });
  }

  try {
    let result;
    if (IMAGE_TYPES.has(file.type)) {
      result = await processImage(file);
    } else if (DOC_TYPES.has(file.type)) {
      result = await processDocument(file);
    } else {
      return Response.json(
        { success: false, error: `Unsupported file type: ${file.type}` },
        { status: 415 }
      );
    }

    return Response.json({ success: true, data: result });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 400 });
  }
}
