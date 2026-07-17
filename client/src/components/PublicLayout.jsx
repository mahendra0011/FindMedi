import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';

export default function PublicLayout({ children, hideFooter = false }) {
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
