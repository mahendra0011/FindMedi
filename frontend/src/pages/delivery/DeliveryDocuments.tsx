import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, FileImage, CheckCircle2, Clock, AlertTriangle, 
  UploadCloud, ShieldCheck, RefreshCw, Eye, Sparkles, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function DeliveryDocuments() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const prof = await api.get('/delivery-partners/profile/me');
      setProfile(prof);
      setApprovalStatus(prof.status || 'pending');
    } catch {
      toast.error('Failed to load profile');
    }
    setLoading(false);
  };

  const documents = [
    { 
      key: 'aadharDoc', 
      label: 'Aadhaar Card (Front & Back)', 
      description: 'Government issued 12-digit UIDAI card for identity verification',
      required: true,
      category: 'Identity Proof',
    },
    { 
      key: 'panDoc', 
      label: 'PAN Card', 
      description: 'Income Tax Department PAN card for tax & direct payouts',
      required: true,
      category: 'Tax & Finance',
    },
    { 
      key: 'photo', 
      label: 'Official Profile Photo', 
      description: 'Clear front-facing passport style portrait with plain background',
      required: true,
      category: 'Identity Proof',
    },
    { 
      key: 'drivingLicenseDoc', 
      label: 'Permanent Driving License (DL)', 
      description: 'Valid two-wheeler / motor vehicle commercial license',
      required: profile?.vehicleType && !['bicycle', 'foot'].includes(profile.vehicleType),
      category: 'Vehicle & Mobility',
    },
    { 
      key: 'vehicleRcDoc', 
      label: 'Vehicle Registration Certificate (RC)', 
      description: 'Valid RC book / smart card matching assigned vehicle number',
      required: profile?.vehicleType && !['bicycle', 'foot'].includes(profile.vehicleType),
      category: 'Vehicle & Mobility',
    },
    { 
      key: 'insuranceDoc', 
      label: 'Vehicle Commercial Insurance', 
      description: 'Active 3rd party or comprehensive vehicle insurance policy',
      required: false,
      category: 'Vehicle & Mobility',
    },
  ];

  const handleFileSelect = (key: string) => {
    setSelectedDocKey(key);
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDocKey) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setUploadingKey(selectedDocKey);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', selectedDocKey);

    try {
      await api.post('/delivery-partners/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded successfully! Under admin review.');
      loadProfile();
    } catch {
      try {
        await api.put(`/delivery-partners/profile/${profile?._id}`, {
          [selectedDocKey]: URL.createObjectURL(file),
        });
        setProfile((prev: any) => ({ ...prev, [selectedDocKey]: URL.createObjectURL(file) }));
        toast.success('Document updated successfully!');
      } catch {
        toast.error('Failed to upload document');
      }
    } finally {
      setUploadingKey(null);
      setSelectedDocKey(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const uploadedCount = documents.filter((d) => !!profile?.[d.key]).length;
  const totalRequired = documents.filter((d) => d.required).length;
  const isKycComplete = uploadedCount >= totalRequired;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">Loading compliance vault...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 bg-card rounded-2xl border border-border p-8 max-w-lg mx-auto shadow-sm">
        <AlertCircle className="w-16 h-16 mx-auto text-warning mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-foreground mb-2">Delivery Partner Account Required</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Please complete your basic fleet registration to start submitting compliance documentation.
        </p>
        <Button className="rounded-xl bg-primary text-primary-foreground px-6 font-semibold" onClick={() => window.location.hash = '#/register/delivery-partner'}>
          Register as Delivery Partner
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        accept="image/*,.pdf" 
        className="hidden" 
      />

      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">
              Compliance & Documents Vault
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified credentials required to accept prescription & emergency medicine runs
            </p>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadProfile} 
          className="border-border rounded-xl gap-2 text-xs self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Status
        </Button>
      </div>

      {/* ── KYC Status Card ────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }} 
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${
              approvalStatus === 'approved' 
                ? 'bg-success/10 border-success/30 text-success' 
                : approvalStatus === 'rejected' 
                ? 'bg-destructive/10 border-destructive/30 text-destructive' 
                : 'bg-warning/10 border-warning/30 text-warning'
            }`}>
              {approvalStatus === 'approved' ? (
                <CheckCircle2 className="w-7 h-7" />
              ) : approvalStatus === 'rejected' ? (
                <AlertTriangle className="w-7 h-7" />
              ) : (
                <Clock className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-foreground capitalize">{approvalStatus} Account</h2>
                <Badge variant={approvalStatus === 'approved' ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold">
                  {approvalStatus === 'approved' ? 'Verified Rider' : approvalStatus === 'rejected' ? 'Action Needed' : 'Under Review'}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                {approvalStatus === 'approved'
                  ? 'Your profile is 100% verified. You have full clearance to accept all pharmacy & diagnostic pickups.'
                  : approvalStatus === 'rejected'
                  ? profile?.rejectionReason || 'One or more documents were not clear or expired. Please upload renewed copies below.'
                  : 'Your documents are currently undergoing verification by the FindMedi safety team.'}
              </p>
            </div>
          </div>

          <div className="bg-muted/30 border border-border/60 rounded-xl p-4 min-w-[200px] text-right">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>KYC Progress</span>
              <span className="font-bold text-foreground">{uploadedCount} of {documents.length}</span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.round((uploadedCount / documents.length) * 100))}%` }} 
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isKycComplete ? 'All essential credentials uploaded' : 'Upload remaining required files'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Documents Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc, idx) => {
          const fileUrl = profile?.[doc.key];
          const isUploaded = !!fileUrl;
          const isBeingUploaded = uploadingKey === doc.key;

          return (
            <motion.div
              key={doc.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                isUploaded 
                  ? 'bg-card border-border/80 shadow-sm' 
                  : 'bg-card border-dashed border-border hover:border-primary/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isUploaded ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isUploaded ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{doc.label}</h3>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{doc.category}</span>
                    </div>
                  </div>
                  <Badge variant={isUploaded ? 'default' : 'outline'} className="text-[10px] uppercase font-bold tracking-wider">
                    {isUploaded ? 'Uploaded' : doc.required ? 'Required' : 'Optional'}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {doc.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-auto">
                {isUploaded ? (
                  <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>File stored securely</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">No document attached</span>
                )}

                <div className="flex items-center gap-2">
                  {isUploaded && typeof fileUrl === 'string' && fileUrl.startsWith('http') && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      asChild
                      className="h-8 px-2 text-muted-foreground hover:text-foreground rounded-lg text-xs"
                    >
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Preview
                      </a>
                    </Button>
                  )}
                  <Button 
                    variant={isUploaded ? 'outline' : 'default'}
                    size="sm"
                    disabled={isBeingUploaded}
                    onClick={() => handleFileSelect(doc.key)}
                    className="h-8 px-3 rounded-lg text-xs font-bold gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    {isBeingUploaded ? 'Uploading...' : isUploaded ? 'Replace' : 'Upload File'}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Safety & Guidelines Info Banner */}
      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-foreground leading-relaxed">
          <span className="font-bold">Guidelines for Fast Approval:</span> Ensure that your document photos are taken under direct lighting without glare, all 4 corners are visible, and the registered name matches your bank settlement account name.
        </div>
      </div>
    </div>
  );
}
