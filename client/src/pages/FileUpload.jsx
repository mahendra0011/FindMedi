import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Image,
  FileText,
  File,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  Cloud,
  ShieldCheck,
  Sparkles,
  LogIn,
  HardDrive,
  RefreshCw,
  ExternalLink,
  ClipboardList,
  Receipt,
  TestTube,
  Stethoscope,
  Brain,
  Scan,
  FileImage,
  Camera,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const UPLOAD_TYPES = [
  {
    value: 'prescription',
    label: 'Prescription',
    hint: 'Hand-written, digital, or scanned',
    icon: ClipboardList,
    accent: 'from-rose-500/15 to-pink-500/10 border-rose-500/30',
    ring: 'ring-rose-500/40',
    accept: '.pdf,.jpg,.jpeg,.png,.gif',
  },
  {
    value: 'lab_report',
    label: 'Lab Report',
    hint: 'Blood test, urine, scan results',
    icon: TestTube,
    accent: 'from-amber-500/15 to-yellow-500/10 border-amber-500/30',
    ring: 'ring-amber-500/40',
    accept: '.pdf,.jpg,.jpeg,.png,.gif',
  },
  {
    value: 'medical_image',
    label: 'Medical image',
    hint: 'JPG, PNG, WebP',
    icon: FileImage,
    accent: 'from-sky-500/15 to-cyan-500/10 border-sky-500/30',
    ring: 'ring-sky-500/40',
    accept: 'image/jpeg,image/png,image/webp',
  },
  {
    value: 'xray',
    label: 'X-ray',
    hint: 'Any image format',
    icon: Scan,
    accent: 'from-violet-500/15 to-indigo-500/10 border-violet-500/30',
    ring: 'ring-violet-500/40',
    accept: 'image/*',
  },
  {
    value: 'bill_invoice',
    label: 'Bill / Invoice',
    hint: 'Payment receipts, bills',
    icon: Receipt,
    accent: 'from-green-500/15 to-emerald-500/10 border-green-500/30',
    ring: 'ring-green-500/40',
    accept: '.pdf,.jpg,.jpeg,.png,.gif',
  },
  {
    value: 'discharge_summary',
    label: 'Discharge Summary',
    hint: 'Hospital discharge notes',
    icon: Stethoscope,
    accent: 'from-blue-500/15 to-indigo-500/10 border-blue-500/30',
    ring: 'ring-blue-500/40',
    accept: '.pdf,.jpg,.jpeg,.png,.gif',
  },
  {
    value: 'document',
    label: 'Document',
    hint: 'PDF or general document',
    icon: File,
    accent: 'from-teal-500/15 to-cyan-500/10 border-teal-500/30',
    ring: 'ring-teal-500/40',
    accept: '.pdf,.jpg,.jpeg,.png,.gif,.txt',
  },
];

// Keywords for auto-detection — runs when a file is selected
const DETECT_KEYWORDS = [
  { keywords: ['prescription', 'rx ', 'rx-', 'medic%', 'medicat', 'doctor\'s note'], value: 'prescription' },
  { keywords: ['lab', 'blood test', 'urine', 'test report', 'pathology', 'biopsy', 'culture'], value: 'lab_report' },
  { keywords: ['bill', 'invoice', 'receipt', 'payment', 'fee', 'charge'], value: 'bill_invoice' },
  { keywords: ['discharge', 'discharge summary', 'hospi', 'admission note'], value: 'discharge_summary' },
  { keywords: ['x-ray', 'xray', 'radiograph', 'ct', 'mri', 'ultrasound', 'scan'], value: 'xray' },
];

function detectCategory(file) {
  const fname = (file?.name || '').toLowerCase();
  const mimeType = file?.type || '';

  // If it's an image and filename suggests x-ray/scan → xray
  for (const { keywords, value } of DETECT_KEYWORDS) {
    if (keywords.some((kw) => fname.includes(kw))) return value;
  }

  // Fallback by MIME type
  if (mimeType.startsWith('image/')) return 'medical_image';
  if (mimeType === 'application/pdf') return 'document';
  return 'document';
}

function isAuthError(status, message) {
  return (
    status === 401 ||
    (message && /token|unauthoriz|not authorized|expired/i.test(String(message)))
  );
}

export default function FileUpload() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadType, setUploadType] = useState('prescription');
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Google Drive integration
  const [searchParams, setSearchParams] = useSearchParams();
  const [driveStatus, setDriveStatus] = useState({ configured: false, connected: false });
  const [driveLoading, setDriveLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const handleSessionExpired = useCallback(() => {
    logout();
    setUploadResult({
      success: false,
      sessionExpired: true,
      error: 'Your session expired or the saved token was invalid. Please sign in again.',
    });
  }, [logout]);

  const fetchDriveStatus = useCallback(async () => {
    try {
      const res = await api.getDriveStatus();
      setDriveStatus({
        configured: res.configured || false,
        connected: res.connected || false,
      });
    } catch {
      setDriveStatus({ configured: false, connected: false });
    }
  }, []);

  const connectDrive = async () => {
    setDriveLoading(true);
    try {
      const res = await api.getDriveAuthUrl();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        setUploadResult({
          success: false,
          error: 'Could not get Google Drive auth URL. Please try again.',
        });
      }
    } catch (e) {
      console.error('Drive connect error:', e);
      const msg = e.response?.data?.error || e.message || 'Failed to connect Drive';
      setUploadResult({
        success: false,
        error: `Drive connection failed: ${msg}`,
      });
    }
    setDriveLoading(false);
  };

  const disconnectDrive = async () => {
    try {
      await api.disconnectDrive();
      setDriveStatus({ configured: driveStatus.configured, connected: false });
      setStorageOption('cloudinary');
    } catch (e) {
      console.error('Drive disconnect error:', e);
    }
  };

  const fetchUploadedFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`${API_URL}/records`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.status === 401) {
        handleSessionExpired();
        setLoadingFiles(false);
        return;
      }

      const data = await res.json();
      if (data.data) {
        const filesWithUploads = data.data
          .filter((r) => r.data?.uploadedFile)
          .map((r) => ({
            ...r,
            fileType: r.type,
            uploadedAt: r.createdAt || r.data?.date,
          }));
        setFiles(filesWithUploads);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
    setLoadingFiles(false);
  }, [handleSessionExpired]);

  useEffect(() => {
    if (user) {
      fetchUploadedFiles();
      fetchDriveStatus();
    }
  }, [user, fetchUploadedFiles, fetchDriveStatus]);

  // Handle OAuth callback redirect
  useEffect(() => {
    const driveParam = searchParams.get('drive');
    if (driveParam === 'connected') {
      setDriveStatus({ configured: true, connected: true });
      setStorageOption('drive');
      setUploadResult({
        success: true,
        filename: 'Google Drive connected',
        size: 0,
        format: '',
        message: 'Your Google Drive is now connected. Files will be saved directly to your Drive.',
      });
      setSearchParams({}, { replace: true });
    } else if (driveParam === 'error') {
      const reason = searchParams.get('reason') || 'Unknown error';
      setUploadResult({
        success: false,
        error: `Google Drive connection failed: ${reason}`,
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getAcceptedTypes = () => {
    const typeDef = UPLOAD_TYPES.find((t) => t.value === uploadType);
    return typeDef ? typeDef.accept : 'image/*,.pdf';
  };

  const uploadSelectedFile = async (file, autoDetect = false) => {
    if (!file) return;

    // Auto-detect category if requested
    let effectiveType = uploadType;
    let wasAutoDetected = false;
    if (autoDetect) {
      const detected = detectCategory(file);
      if (detected !== uploadType) {
        effectiveType = detected;
        wasAutoDetected = true;
        setUploadType(detected);
      }
    }

    setLoading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', effectiveType);

    // Always upload to Google Drive (Cloudinary removed)
    const endpoint = `${API_URL}/drive/upload`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: `Server error: ${res.status}` };
      }

      const msg = data.error || data.message || '';

      if (res.status === 401 || isAuthError(res.status, msg)) {
        handleSessionExpired();
        setLoading(false);
        return;
      }

      if (!res.ok || !data.success) {
        setUploadResult({
          success: false,
          error: msg || `Error: ${res.status}`,
        });
        setLoading(false);
        return;
      }

      setUploadResult({
        success: true,
        filename: data.filename,
        size: data.size,
        format: data.format || '',
        storedIn: data.storedIn || 'cloudinary',
        uploadType: data.uploadType || effectiveType,
        wasAutoDetected,
      });

      fetchUploadedFiles();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const handleFileInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) uploadSelectedFile(f, true); // true → auto-detect category
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    handleDrag(e);
    if (e.dataTransfer.types?.includes('Files')) setIsDragging(true);
  };

  const handleDragOut = (e) => {
    handleDrag(e);
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    handleDrag(e);
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) uploadSelectedFile(f, true); // true → auto-detect category
  };

  const getFileIcon = (fileType) => {
    const IconMap = {
      medical_image: <FileImage className="w-5 h-5 text-sky-500" />,
      xray: <Scan className="w-5 h-5 text-violet-500" />,
      prescription: <ClipboardList className="w-5 h-5 text-rose-500" />,
      lab_report: <TestTube className="w-5 h-5 text-amber-500" />,
      bill_invoice: <Receipt className="w-5 h-5 text-green-500" />,
      discharge_summary: <Stethoscope className="w-5 h-5 text-blue-500" />,
      document: <File className="w-5 h-5 text-teal-500" />,
    };
    return IconMap[fileType] || <FileText className="w-5 h-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const getFileUrl = (file) => {
    return (
      file.data?.uploadedFile?.url ||
      `${API_URL.replace('/api', '')}${file.data?.uploadedFile?.filepath}`
    );
  };

  const FILE_TYPE_GROUPS = {
    images: ['medical_image', 'xray'],
    prescriptions: ['prescription'],
    lab: ['lab_report'],
    bills: ['bill_invoice'],
    discharge: ['discharge_summary'],
    documents: ['document'],
  };

  const filteredFiles = {
    images: files.filter((f) => FILE_TYPE_GROUPS.images.includes(f.fileType)),
    prescriptions: files.filter((f) => FILE_TYPE_GROUPS.prescriptions.includes(f.fileType)),
    lab: files.filter((f) => FILE_TYPE_GROUPS.lab.includes(f.fileType)),
    bills: files.filter((f) => FILE_TYPE_GROUPS.bills.includes(f.fileType)),
    discharge: files.filter((f) => FILE_TYPE_GROUPS.discharge.includes(f.fileType)),
    documents: files.filter((f) => FILE_TYPE_GROUPS.documents.includes(f.fileType)),
    all: files,
  };

  const fileTypeLabel = (fileType) => {
    const labels = {
      medical_image: 'Medical image',
      xray: 'X-ray',
      prescription: 'Prescription',
      lab_report: 'Lab report',
      bill_invoice: 'Bill / Invoice',
      discharge_summary: 'Discharge Summary',
      document: 'Document',
    };
    return labels[fileType] || 'File';
  };

  if (!user || user.role !== 'patient') {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
          <AlertTriangle className="w-14 h-14 mx-auto mb-4 text-amber-500" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Access restricted
          </h1>
          <p className="text-muted-foreground mt-2">Only patients can upload medical files.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-accent/30 px-5 py-5 sm:px-8 sm:py-6 shadow-sm">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
         <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <Badge
              variant="default"
              className="gap-1 font-normal text-[10px] bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
            >
              <HardDrive className="w-3 h-3 text-cyan-500" />
              Your Google Drive
            </Badge>
            <Badge variant="outline" className="gap-1 font-normal border-primary/30 text-[10px]">
              <ShieldCheck className="w-3 h-3 text-primary" />
              Private & Secure
            </Badge>
          </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Your Medical Vault
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Upload prescriptions, lab reports, bills, and discharge summaries — they're saved
              directly to your own Google Drive, not on our servers. Your health records stay private.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 backdrop-blur-sm rounded-lg border px-3 py-2 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Up to 25 MB per file</span>
          </div>
        </div>
      </div>

      {uploadResult && (
        <Card
          className={
            uploadResult.success
              ? 'border-emerald-500/40 bg-emerald-500/[0.03] shadow-sm'
              : uploadResult.sessionExpired
                ? 'border-amber-500/50 bg-amber-500/[0.04]'
                : 'border-destructive/50 bg-destructive/[0.03]'
          }
        >
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {uploadResult.success ? (
                <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : uploadResult.sessionExpired ? (
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-destructive shrink-0" />
              )}
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-lg">
                  {uploadResult.success
                    ? 'Upload complete'
                    : uploadResult.sessionExpired
                      ? 'Session needs refresh'
                      : 'Upload failed'}
                </p>
                {uploadResult.success ? (
                   <ul className="text-sm text-muted-foreground space-y-1">
                     <li>
                       <span className="text-foreground font-medium">File:</span> {uploadResult.filename}
                     </li>
                     <li>
                       <span className="text-foreground font-medium">Size:</span>{' '}
                       {formatFileSize(uploadResult.size)}
                     </li>
                     {uploadResult.format ? (
                       <li>
                         <span className="text-foreground font-medium">Format:</span>{' '}
                         {String(uploadResult.format).toUpperCase()}
                       </li>
                     ) : null}
                     {uploadResult.storedIn ? (
                       <li>
                         <span className="text-foreground font-medium">Stored in:</span>{' '}
                         {uploadResult.storedIn === 'drive' ? 'Google Drive' : 'Cloudinary'}
                       </li>
                     ) : null}
                     {uploadResult.uploadType ? (
                       <li>
                         <span className="text-foreground font-medium">Category:</span>{' '}
                         <span className="capitalize">{uploadResult.uploadType.replace(/_/g, ' ')}</span>
                         {uploadResult.wasAutoDetected && (
                           <span className="text-xs text-muted-foreground ml-1">(auto-detected)</span>
                         )}
                       </li>
                     ) : null}
                   </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{uploadResult.error}</p>
                )}
                {uploadResult.sessionExpired && (
                  <div className="pt-2">
                    <Button asChild>
                      <Link to="/login">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign in again
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-11 p-1 bg-muted/80 rounded-xl">
          <TabsTrigger
            value="upload"
            className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-background"
          >
            Upload
          </TabsTrigger>
          <TabsTrigger
            value="myfiles"
            className="rounded-lg data-[state=active]:shadow-sm data-[state=active]:bg-background"
          >
            My files ({files.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 mt-4">
          {driveStatus.connected ? (
            <>
              <Card className="overflow-hidden border-muted shadow-sm">
                <CardHeader className="space-y-0.5 pb-1">
                  <CardTitle className="text-lg tracking-tight">
                    What are you uploading?
                  </CardTitle>
                  <CardDescription className="text-xs">Choose a category so we file it correctly in your records.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {UPLOAD_TYPES.map((t) => {
                      const Icon = t.icon;
                      const active = uploadType === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setUploadType(t.value)}
                          className={`
                            relative text-left rounded-xl border-2 p-3 transition-all duration-200
                            bg-gradient-to-br ${t.accent}
                            ${active ? `ring-2 ${t.ring} border-primary shadow-md scale-[1.01]` : 'border-border/80 hover:border-primary/40 hover:shadow-sm'}
                          `}
                        >
                          {active && (
                            <span className="absolute top-2 right-2 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                            </span>
                          )}
                          <Icon className={`w-6 h-6 mb-2 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                          <p className="font-semibold text-sm">{t.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.hint}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Category auto-detected when you drop/select a file</span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-cyan-500" />
                      Saving to your Google Drive
                    </span>
                  </div>

                  {/* Camera + File Picker options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Camera Capture */}
                    <div>
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadSelectedFile(f, true);
                        }}
                        className="hidden"
                        id="camera-upload"
                        disabled={loading}
                      />
                      <label htmlFor="camera-upload" className="cursor-pointer block">
                        <div
                          className={`
                            relative rounded-xl border-2 border-dashed p-4 text-center transition-all duration-300
                            ${loading ? 'pointer-events-none opacity-70' : 'border-primary/25 bg-muted/30 hover:bg-primary/[0.06] hover:border-primary/50'}
                          `}
                        >
                          <Camera className="w-8 h-8 mx-auto mb-2 text-primary opacity-60" />
                          <p className="font-medium text-sm">Take a photo</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Capture prescription or wound
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* File Picker */}
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={getAcceptedTypes()}
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="file-upload"
                        disabled={loading}
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block">
                        <div
                          onDragEnter={handleDragIn}
                          onDragLeave={handleDragOut}
                          onDragOver={handleDragIn}
                          onDrop={handleDrop}
                          className={`
                            relative rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all duration-300
                            ${isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-primary/25 bg-muted/30 hover:bg-primary/[0.06] hover:border-primary/50'}
                            ${loading ? 'pointer-events-none opacity-70' : ''}
                          `}
                        >
                          {loading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/70 backdrop-blur-[2px]">
                              <Loader2 className="w-8 h-8 animate-spin text-primary mb-1" />
                              <p className="text-xs font-medium text-foreground">Uploading…</p>
                            </div>
                          )}
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary mb-2">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="font-medium text-sm">Choose from files</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {UPLOAD_TYPES.find((t) => t.value === uploadType)?.hint || 'Browse files'}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Prominent Connect Drive card — center section */
            <Card className="border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5">
              <CardContent className="py-10 text-center">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-500 mb-4">
                  <HardDrive className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Connect Google Drive</h2>
                <p className="text-sm text-muted-foreground mb-1 max-w-md mx-auto">
                  Save prescriptions & reports directly to your own Google Drive for privacy.
                  No files are stored on our servers — everything goes directly to your personal Drive.
                </p>
                <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
                  After connecting, choose a category (Prescription, Lab Report, Bill, etc.),
                  take a photo or select a file — it uploads straight to your Drive.
                </p>
                <Button variant="default" size="lg" onClick={connectDrive} disabled={driveLoading} className="gap-2">
                  {driveLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Connect Drive
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="myfiles" className="mt-4">
          {loadingFiles ? (
            <Card className="border-muted shadow-sm">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Loading your files…</p>
              </CardContent>
            </Card>
          ) : filteredFiles.all.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-16 text-center">
                <FileText className="w-14 h-14 mx-auto mb-4 text-muted-foreground/60" />
                <p className="text-lg font-semibold">No files yet</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Upload a document or image on the Upload tab — it will show up here with quick view
                  and download links.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Category filter + Stats cards */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Filter:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'all', label: 'All Files', count: files.length },
                      { key: 'images', label: 'Images & X-rays', count: filteredFiles.images.length },
                      { key: 'prescriptions', label: 'Prescriptions', count: filteredFiles.prescriptions.length },
                      { key: 'lab', label: 'Lab Reports', count: filteredFiles.lab.length },
                      { key: 'bills', label: 'Bills', count: filteredFiles.bills.length },
                      { key: 'discharge', label: 'Discharge', count: filteredFiles.discharge.length },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setActiveFilter(filter.key)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          activeFilter === filter.key
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {filter.label} ({filter.count})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Images & X-rays', count: filteredFiles.images.length, icon: FileImage, tone: 'text-sky-500' },
                    { label: 'Prescriptions', count: filteredFiles.prescriptions.length, icon: ClipboardList, tone: 'text-rose-500' },
                    { label: 'Lab Reports', count: filteredFiles.lab.length, icon: TestTube, tone: 'text-amber-500' },
                    { label: 'Bills & Invoices', count: filteredFiles.bills.length, icon: Receipt, tone: 'text-green-500' },
                    { label: 'Discharge', count: filteredFiles.discharge.length, icon: Stethoscope, tone: 'text-blue-500' },
                    { label: 'Documents', count: filteredFiles.documents.length, icon: File, tone: 'text-teal-500' },
                    { label: 'All Files', count: files.length, icon: Upload, tone: 'text-primary' },
                  ].map((s) => (
                    <Card key={s.label} className="shadow-sm border-muted/80 overflow-hidden">
                      <CardContent className="pt-4 pb-3 flex items-center gap-3">
                        <s.icon className={`w-8 h-8 ${s.tone} opacity-90 shrink-0`} />
                        <div>
                          <p className="text-2xl font-bold tabular-nums">{s.count}</p>
                          <p className="text-[11px] text-muted-foreground">{s.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.all
                  .filter((file) => {
                    if (activeFilter === 'all') return true;
                    return filteredFiles[activeFilter]?.includes(file);
                  })
                  .map((file, idx) => (
                  <Card
                    key={file._id || idx}
                    className="group hover:shadow-lg hover:border-primary/20 transition-all duration-200 border-muted/80"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(file.fileType)}
                          <CardTitle className="text-sm font-medium truncate">
                            {file.data?.uploadedFile?.filename || 'Uploaded file'}
                          </CardTitle>
                        </div>
                        <span className="text-[10px] uppercase tracking-wide px-2 py-1 bg-secondary rounded-md shrink-0">
                          {fileTypeLabel(file.fileType)}
                        </span>
                      </div>
                      <CardDescription className="text-xs">
                        {formatDate(file.uploadedAt || file.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4 text-xs">
                        {file.data?.uploadedFile && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Size</span>
                              <span>{formatFileSize(file.data.uploadedFile.size)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Storage</span>
                              <span className="flex items-center gap-1">
                                {file.data.uploadedFile.storedIn === 'drive' ? (
                                  <>
                                    <HardDrive className="w-3 h-3 text-cyan-500" />
                                    Google Drive
                                  </>
                                ) : (
                                  <>
                                    <Cloud className="w-3 h-3" />
                                    Cloudinary
                                  </>
                                )}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a href={getFileUrl(file)} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            View
                          </a>
                        </Button>
                        <Button size="sm" className="flex-1" asChild>
                          <a href={getFileUrl(file)} download target="_blank" rel="noopener noreferrer">
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
