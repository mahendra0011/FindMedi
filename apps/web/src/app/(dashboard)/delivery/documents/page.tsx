'use client';

import { motion } from 'motion/react';
import { FileText, FileImage, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDeliveryProfile } from '@/features/delivery';

export default function DeliveryDocumentsPage() {
  const { data: profile, isLoading } = useDeliveryProfile();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Please complete registration first</p>
        <Button className="mt-4 rounded-xl" onClick={() => (window.location.hash = '#/register/delivery-partner')}>
          Register Now
        </Button>
      </div>
    );
  }

  const p = profile as unknown as Record<string, unknown>;
  const approvalStatus = (p.status as string) ?? 'pending';
  const vehicleType = p.vehicleType as string | undefined;

  const documents = [
    { key: 'aadharDoc', label: 'Aadhar Card', required: true },
    { key: 'panDoc', label: 'PAN Card', required: true },
    { key: 'photo', label: 'Profile Photo', required: true },
    {
      key: 'drivingLicenseDoc',
      label: 'Driving License',
      required: !!vehicleType && !['bicycle', 'foot', 'bicycle', 'on-foot'].includes(vehicleType),
    },
    {
      key: 'vehicleRcDoc',
      label: 'Vehicle RC',
      required: !!vehicleType && !['bicycle', 'foot', 'bicycle', 'on-foot'].includes(vehicleType),
    },
    { key: 'insuranceDoc', label: 'Insurance', required: false },
  ].filter((d) => d.required !== false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Documents & KYC</h1>
        <p className="text-muted-foreground">Track your verification status and upload documents</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              approvalStatus === 'approved'
                ? 'bg-emerald-500/10'
                : approvalStatus === 'rejected'
                  ? 'bg-destructive/10'
                  : 'bg-amber-500/10'
            }`}
          >
            {approvalStatus === 'approved' ? (
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            ) : approvalStatus === 'rejected' ? (
              <XCircle className="w-8 h-8 text-destructive" />
            ) : (
              <Clock className="w-8 h-8 text-amber-500" />
            )}
          </div>
          <div>
            <h2 className="font-heading font-semibold text-xl text-foreground capitalize">{approvalStatus}</h2>
            <p className="text-sm text-muted-foreground">
              {approvalStatus === 'approved'
                ? 'Your documents have been verified. You can start accepting deliveries.'
                : approvalStatus === 'rejected'
                  ? (p.rejectionReason as string) || 'Your documents were rejected. Please re-upload.'
                  : 'Your documents are being reviewed. This typically takes 24-48 hours.'}
            </p>
            {approvalStatus === 'rejected' && !!p.rejectionReason && (
              <div className="mt-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                <strong>Reason:</strong> {String(p.rejectionReason as string)}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {documents.map((doc) => {
            const uploaded = !!p[doc.key];
            return (
              <div key={doc.key} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${uploaded ? 'bg-emerald-500/10' : 'bg-muted'}`}
                  >
                    {uploaded ? (
                      <FileImage className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.label}</p>
                    <p className="text-xs text-muted-foreground">{doc.required ? 'Required' : 'Optional'}</p>
                  </div>
                </div>
                <Badge variant={uploaded ? 'default' : 'secondary'}>{uploaded ? 'Uploaded' : 'Pending'}</Badge>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
