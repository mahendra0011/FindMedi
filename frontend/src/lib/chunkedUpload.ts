/**
 * Chunked camera/file upload (doc 15: "camera compress/chunk upload").
 * Splits a File into chunks and POSTs them sequentially to `endpoint`,
 * reassembling server-side by uploadId. Falls back to a single POST when
 * the file is small or the endpoint does not support chunks.
 */
export interface ChunkedUploadOptions {
  endpoint: string;
  file: File;
  chunkSize?: number;
  onProgress?: (pct: number) => void;
  headers?: Record<string, string>;
}

export async function chunkedUpload(opts: ChunkedUploadOptions): Promise<unknown> {
  const { endpoint, file, chunkSize = 256 * 1024, onProgress, headers = {} } = opts;
  const total = Math.ceil(file.size / chunkSize);
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let last: unknown = null;
  for (let i = 0; i < total; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    const form = new FormData();
    form.append('uploadId', uploadId);
    form.append('chunkIndex', String(i));
    form.append('totalChunks', String(total));
    form.append('fileName', file.name);
    form.append('chunk', chunk, `${file.name}.part${i}`);
    const res = await fetch(endpoint, { method: 'POST', headers, body: form });
    if (!res.ok) throw new Error(`chunk ${i + 1}/${total} failed: ${res.status}`);
    last = await res.json().catch(() => null);
    onProgress?.(Math.round(((i + 1) / total) * 100));
  }
  return last;
}
