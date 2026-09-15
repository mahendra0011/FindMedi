/**
 * On-demand revalidation endpoint.
 *
 * Triggered by the backend (or an admin webhook) when content changes, so that
 * statically generated pages can be refreshed without a full rebuild.
 *
 * POST /api/revalidate  { secret, path?, tag? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, tag, secret } = body as { path?: string; tag?: string; secret?: string };

    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    if (tag) {
      revalidateTag(tag, 'default');
    }

    if (path) {
      revalidatePath(path);
    }

    if (!tag && !path) {
      revalidatePath('/');
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json(
      {
        message: 'Error during revalidation',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
