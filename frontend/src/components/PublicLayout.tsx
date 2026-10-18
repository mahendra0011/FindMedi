import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import type { Unmodelled } from '@/lib/apiTypes';

export default function PublicLayout({ children, hideFooter = false }: Unmodelled) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <PublicFooter />}
    </div>
  );
}
