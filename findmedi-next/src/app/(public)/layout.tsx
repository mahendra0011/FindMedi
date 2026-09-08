/**
 * Public layout — wraps all public/unauthenticated pages.
 * Includes the public navbar and footer.
 *
 * Server Component (no client hooks needed for the static layout shell).
 */
import type { ReactNode } from 'react';
import PublicNavbar from '@/components/shared/layout/PublicNavbar';
import PublicFooter from '@/components/shared/layout/PublicFooter';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
