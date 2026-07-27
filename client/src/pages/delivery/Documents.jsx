import { useState, useEffect } from 'react';
import { FileImage, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import apiClient from '@/lib/axios';

const docLabels = {
  aadharDoc: 'Aadhar Card',
  panDoc: 'PAN Card',
  drivingLicenseDoc: 'Driving License',
  vehicleRcDoc: 'Vehicle RC',
  insuranceDoc: 'Insurance',
  photo: 'Profile Photo',
};

export default function Documents() {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.get('/delivery-partners/profile/me');
      setPartner(data);
    } catch {
      toast.error('Failed to load documents');
    }
    setLoading(false);
  };

  const uploadDoc = async (field, file) => {
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('field', field);
      await apiClient.post(`/delivery-partners/upload-doc/${partner._id}`, formData);
      toast.success(`${docLabels[field]} uploaded`);
      loadProfile();
    } catch {
      toast.error('Upload failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const docs = partner?.docs || {};
  const allUploaded = Object.keys(docLabels).every((k) => docs[k]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Documents</h1>
        <p className="page-subtitle">Manage your KYC and vehicle documents</p>
      </div>

      {partner?.status === 'pending' && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-warning" />
          <div>
            <p className="font-medium text-warning">Verification in Progress</p>
            <p className="text-sm text-muted-foreground">
              Your documents are being reviewed. Status: <strong>{partner.status}</strong>
            </p>
          </div>
        </div>
      )}

      {partner?.rejectionReason && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Registration Rejected</p>
            <p className="text-sm text-muted-foreground">{partner.rejectionReason}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(docLabels).map(([key, label]) => {
          const uploaded = docs[key];
          return (
            <div key={key} className="bg-card rounded-xl border p-5">
              <div className="flex items-center gap-3 mb-3">
                <FileImage className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{label}</h3>
              </div>
              {uploaded ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-success font-medium">Uploaded</span>
                </div>
              ) : (
                <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadDoc(key, file);
                    }}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 text-muted-foreground mr-2" />
                  <span className="text-sm text-muted-foreground">Upload {label}</span>
                </label>
              )}
            </div>
          );
        })}
      </div>

      {allUploaded && partner?.status === 'pending' && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success" />
          <div>
            <p className="font-medium text-success">All Documents Uploaded</p>
            <p className="text-sm text-muted-foreground">Your application is under review. You'll be notified once approved.</p>
          </div>
        </div>
      )}
    </div>
  );
}
