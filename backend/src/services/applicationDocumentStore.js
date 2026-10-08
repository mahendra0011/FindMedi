import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// 2.md 5: join documents live in private storage and are only ever reached
// through the authenticated `/uploads` gate or the reviewer workspace - never
// a bare public URL. The single function is the seam where S3/GCS swaps in
// (Cloudinary already exists in `routes/upload.js` for public media); keeping
// it here means the join route never learns where bytes actually land.
export const APPLICATION_DOCUMENTS_DIR = path.join(process.cwd(), 'public', 'uploads', 'documents');

export async function saveApplicationDocument(buffer, originalName) {
  const base = path.basename(String(originalName || 'document')).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80);
  const key = `${randomUUID()}-${base || 'document'}`;
  await fs.mkdir(APPLICATION_DOCUMENTS_DIR, { recursive: true });
  await fs.writeFile(path.join(APPLICATION_DOCUMENTS_DIR, key), buffer);
  return { url: `/uploads/documents/${key}`, key, storage: 'local' };
}
