/**
 * Join Platform page — Server Component (SEO-critical landing page).
 * Ported from client/src/pages/JoinPlatform.jsx.
 */
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Join FindMedi Platform | Healthcare Management Solution',
  description: 'Join FindMedi as a doctor, hospital, lab, or pharmacy. Modern healthcare management software.',
};

export default function JoinPlatformPage() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Join the FindMedi Platform</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Modern healthcare management software for doctors, hospitals, diagnostic centers, and pharmacies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="border rounded-lg p-6 text-center">
          <h3 className="font-semibold text-lg mb-2">For Doctors</h3>
          <p className="text-sm text-muted-foreground mb-4">Manage your practice, appointments, and patient records.</p>
          <Button asChild><Link href="/signup?role=doctor">Get Started</Link></Button>
        </div>
        <div className="border rounded-lg p-6 text-center">
          <h3 className="font-semibold text-lg mb-2">For Hospitals</h3>
          <p className="text-sm text-muted-foreground mb-4">All-in-one hospital management system.</p>
          <Button asChild><Link href="/signup?role=hospital_admin">Get Started</Link></Button>
        </div>
        <div className="border rounded-lg p-6 text-center">
          <h3 className="font-semibold text-lg mb-2">For Labs & Pharmacies</h3>
          <p className="text-sm text-muted-foreground mb-4">Manage inventory, orders, and patient care.</p>
          <Button asChild><Link href="/signup?role=pharmacy_owner">Get Started</Link></Button>
        </div>
      </div>
    </div>
  );
}
