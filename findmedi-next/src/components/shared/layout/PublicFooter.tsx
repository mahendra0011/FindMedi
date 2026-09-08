/**
 * PublicFooter — footer for public-facing pages.
 */
import Link from 'next/link';

export default function PublicFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto py-8 text-sm">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div>
            <h4 className="font-semibold mb-3">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="hover:text-primary">About</Link></li>
              <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
              <li><Link href="/careers" className="hover:text-primary">Careers</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Services</h4>
            <ul className="space-y-2">
              <li><Link href="/doctors" className="hover:text-primary">Find Doctors</Link></li>
              <li><Link href="/hospitals" className="hover:text-primary">Hospitals</Link></li>
              <li><Link href="/diagnostic-centers" className="hover:text-primary">Diagnostic Centers</Link></li>
              <li><Link href="/buy-medicine" className="hover:text-primary">Medicine Store</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">For Professionals</h4>
            <ul className="space-y-2">
              <li><Link href="/join-platform" className="hover:text-primary">Join as Doctor</Link></li>
              <li><Link href="/join-platform" className="hover:text-primary">Join as Hospital</Link></li>
              <li><Link href="/join-platform" className="hover:text-primary">Join as Lab</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
              <li><Link href="/disclaimer" className="hover:text-primary">Disclaimer</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-heading text-xl font-bold text-primary">FindMedi</div>
            <p className="mt-2 text-xs text-muted-foreground">
              &copy; 2024 FindMedi. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
