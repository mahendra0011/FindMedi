/**
 * Client-side image compression for camera uploads (doc 15: "camera
 * compress/chunk upload"). Resizes to maxDimension and re-encodes as JPEG
 * at the given quality. Returns a new File.
 */
export async function compressImage(file: File, opts?: { maxDimension?: number; quality?: number }): Promise<File> {
  const maxDimension = opts?.maxDimension ?? 1600;
  const quality = opts?.quality ?? 0.8;
  if (!file.type.startsWith('image/')) return file;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('image load failed'));
    i.src = URL.createObjectURL(file);
  });

  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(img.src);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}
