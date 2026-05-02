import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const THUMB_DIR  = path.join(UPLOAD_DIR, 'thumbnails');

const IMAGE_TYPES    = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg']);
const DOC_TYPES      = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;  // 10 MB
const DOC_MAX_BYTES   = 25 * 1024 * 1024;  // 25 MB

async function ensureDirs() {
  await fs.mkdir(UPLOAD_DIR,  { recursive: true });
  await fs.mkdir(THUMB_DIR,   { recursive: true });
}

/**
 * Processes an image file: converts to WebP (max 1920px), generates a 400px thumbnail.
 * Returns { filename, thumbFilename, originalName, fileType, fileSize }.
 */
export async function processImage(file) {
  await ensureDirs();

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}`);
  }
  if (buffer.length > IMAGE_MAX_BYTES) {
    throw new Error('Image exceeds 10 MB limit');
  }

  const id       = uuidv4();
  const filename = `${id}.webp`;
  const thumbFilename = `thumb_${id}.webp`;

  await sharp(buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(path.join(UPLOAD_DIR, filename));

  await sharp(buffer)
    .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(path.join(THUMB_DIR, thumbFilename));

  return {
    filename,
    thumbFilename,
    originalName: file.name,
    fileType:     'image/webp',
    fileSize:     buffer.length,
  };
}

/**
 * Saves a document file (PDF, Word) as-is.
 * Returns { filename, originalName, fileType, fileSize }.
 */
export async function processDocument(file) {
  await ensureDirs();

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!DOC_TYPES.has(file.type)) {
    throw new Error(`Unsupported document type: ${file.type}`);
  }
  if (buffer.length > DOC_MAX_BYTES) {
    throw new Error('Document exceeds 25 MB limit');
  }

  const ext      = file.name.split('.').pop().toLowerCase();
  const filename = `${uuidv4()}.${ext}`;

  await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return {
    filename,
    originalName: file.name,
    fileType:     file.type,
    fileSize:     buffer.length,
  };
}

/**
 * Deletes an uploaded file and its thumbnail if it exists.
 */
export async function deleteUpload(filename) {
  const main  = path.join(UPLOAD_DIR, filename);
  const thumb = path.join(THUMB_DIR, `thumb_${filename}`);
  await fs.unlink(main).catch(() => {});
  await fs.unlink(thumb).catch(() => {});
}
