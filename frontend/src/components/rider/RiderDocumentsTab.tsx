import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function RiderDocReupload({ onDone }: { onDone: () => void }) {
  const [docType, setDocType] = useState('drivingLicense');
  const [uploading, setUploading] = useState(false);
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const u: any = await api.uploadPublicDocument(file);
      const url = u?.url || u?.path || '';
      if (!url) throw new Error('Upload returned no URL');
      await api.uploadRiderDocument({ docType, docUrl: url });
      toast.success('Document uploaded for verification');
      onDone();
    } catch (err: any) {
      toast.error(err.message || 'Document upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  return (
    <div className="pt-3 border-t space-y-2">
      <label className="text-xs font-semibold">Re-upload rejected document</label>
      <div className="flex gap-2">
        <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-9 rounded-xl border text-xs bg-background px-2">
          <option value="drivingLicense">Driving Licence</option>
          <option value="govtId">Government ID</option>
          <option value="rc">RC</option>
          <option value="insurance">Insurance</option>
        </select>
        <input type="file" accept="image/*,.pdf" disabled={uploading} onChange={upload} className="w-full text-xs" />
      </div>
      {uploading && <p className="text-[11px] text-muted-foreground">Uploading...</p>}
    </div>
  );
}

export interface RiderDocumentsTabProps {
  profile: any;
  vehicle: any;
  isVerified: boolean;
  loadDashboardData: () => Promise<void>;
  navigate: (path: string) => void;
}

export const RiderDocumentsTab: React.FC<RiderDocumentsTabProps> = ({
  profile,
  vehicle,
  isVerified,
  loadDashboardData,
  navigate,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/rider/dashboard')}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Button>
        <h3 className="font-bold text-base text-foreground">Documents & Compliance KYC</h3>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <div className="divide-y divide-border/60 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Driving License (DL)</p>
              <p className="text-muted-foreground">No: {profile?.drivingLicenseNumber || 'N/A'}</p>
            </div>
            <Badge variant={isVerified ? 'default' : 'secondary'}>
              {isVerified ? 'Verified' : 'Under Review'}
            </Badge>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Government ID ({profile?.govtIdType || 'Aadhaar'})</p>
              <p className="text-muted-foreground">No: {profile?.govtIdNumber || 'N/A'}</p>
            </div>
            <Badge variant={isVerified ? 'default' : 'secondary'}>
              {isVerified ? 'Verified' : 'Under Review'}
            </Badge>
          </div>

          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Vehicle Registration Certificate (RC)</p>
              <p className="text-muted-foreground">RC No: {vehicle?.rcNumber || 'N/A'}</p>
            </div>
            <Badge variant={vehicle?.isDocumentVerified ? 'default' : 'secondary'}>
              {vehicle?.isDocumentVerified ? 'Verified' : 'Under Review'}
            </Badge>
          </div>
          <RiderDocReupload onDone={() => loadDashboardData()} />
        </div>
      </div>
    </div>
  );
};
