/**
 * Pending approval page — Server Component.
 * Shown when a doctor/clinic registration is pending admin approval.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Mail, Phone } from 'lucide-react';

export const metadata = {
  title: 'Account Pending Approval | FindMedi',
  description: 'Your account is pending administrator approval. We will notify you via email once approved.',
};

export default function PendingApprovalPage() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen py-12 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Pending Approval</CardTitle>
          <CardDescription>
            Your account is awaiting administrator approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span>Approval typically takes 24-48 hours.</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span>We will email you once your account is approved.</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <span>You can also call support for urgent inquiries.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
