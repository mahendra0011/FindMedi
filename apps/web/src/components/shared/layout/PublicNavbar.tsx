/**
 * PublicNavbar — top navigation bar for unauthenticated/public pages.
 * Replaces PublicNavbar.jsx from the old Vite project.
 *
 * Server-safe (no client hooks needed for the static nav).
 * The role selector dropdown uses useAuth(), so this is a Client Component
 * when used in context that needs auth.
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Phone, Menu } from 'lucide-react';

export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between">
        <Link href="/" className="font-heading text-xl font-bold text-primary">
          FindMedi
        </Link>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/doctors" className="hover:text-primary">Doctors</Link>
          <Link href="/hospitals" className="hover:text-primary">Hospitals</Link>
          <Link href="/diagnostic-centers" className="hover:text-primary">Diagnostic Centers</Link>
          <Link href="/buy-medicine" className="hover:text-primary">Medicine Store</Link>
        </nav>

        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <Search className="h-4 w-4" />
            <span className="ml-2">Search</span>
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <Phone className="h-4 w-4" />
            <span className="ml-2">Call</span>
          </Button>
          <Button asChild variant="default" size="sm">
            <Link href="/login">Login</Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
