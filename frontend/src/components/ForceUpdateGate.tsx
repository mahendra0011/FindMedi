import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';

function parseVersion(v: string) {
  return v.split('.').map((n) => parseInt(n, 10) || 0);
}

function isOlder(current: string, min: string) {
  const a = parseVersion(current);
  const b = parseVersion(min);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}

const CURRENT_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export function ForceUpdateGate({ children }: PropsWithChildren) {
  const [blocked, setBlocked] = useState(false);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/config/version');
        if (!res.ok) return;
        const data = await res.json() as { forceUpdate?: boolean; minVersion?: string; storeUrl?: string };
        if (cancelled) return;
        if (data.forceUpdate || (data.minVersion && isOlder(CURRENT_VERSION, data.minVersion))) {
          setBlocked(true);
          setStoreUrl(data.storeUrl || null);
        }
      } catch {
        // fail open: never block on network error
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!blocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center space-y-3">
        <h1 className="text-xl font-bold">Update required</h1>
        <p className="text-sm text-muted-foreground">
          This version of FindMedi is no longer supported. Please update to continue.
        </p>
        {storeUrl ? (
          <a href={storeUrl} className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Update now
          </a>
        ) : null}
      </div>
    </div>
  );
}
