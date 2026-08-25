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
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  ShieldCheck,
  Sparkles,
  LogIn,
  HardDrive,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, getApiBaseUrl } from '@/lib/api';

const API_URL = getApiBaseUrl();

const UPLOAD_TYPES = [
  {
    value: 'image',
    label: 'Medical Image',
    hint: 'JPG, PNG, WebP',
    icon: Image,
    accent: 'from-sky-500/15 to-cyan-500/10 border-sky-500/30',
    ring: 'ring-sky-500/40',
  },
  {
    value: 'xray',
    label: 'X-Ray / Scan',
    hint: 'Any image format',
    icon: Image,
    accent: 'from-violet-500/15 to-indigo-500/10 border-violet-500/30',
    ring: 'ring-violet-500/40',
  },
  {
    value: 'document',
    label: 'PDF / Document',
    hint: 'PDF, Word, or Scans',
    icon: FileText,
    accent: 'from-emerald-500/15 to-teal-500/10 border-emerald-500/30',
    ring: 'ring-emerald-500/40',
  },
];

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
  const [uploadType, setUploadType] = useState('image');
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Google Drive integration state
  const [searchParams, setSearchParams] = useSearchParams();
  const [driveStatus, setDriveStatus] = useState({ configured: true, connected: false });
  const [driveLoading, setDriveLoading] = useState(false);

  const handleSessionExpired = useCallback(() => {
    logout();
    setUploadResult({
      success: false,
      sessionExpired: true,
      error: 'Your session expired. Please sign in again.',
    });
  }, [logout]);

  const fetchDriveStatus = useCallback(async () => {
    try {
      const res = await api.getDriveStatus();
      setDriveStatus({
        configured: res.configured !== false,
        connected: Boolean(res.connected),
      });
    } catch {
      setDriveStatus({ configured: true, connected: false });
    }
  }, []);

  const connectDrive = async () => {
    setDriveLoading(true);
    try {
      const res = await api.getDriveAuthUrl();
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      console.error('Drive connect error:', e);
      setUploadResult({
        success: false,
        error: e.message || 'Failed to initiate Google Drive connection.',
      });
    }
    setDriveLoading(false);
  };

  const disconnectDrive = async () => {
    try {
      await api.disconnectDrive();
      setDriveStatus(prev => ({ ...prev, connected: false }));
      setUploadResult(null);
    } catch (e) {
      console.error('Drive disconnect error:', e);
    }
  };

  const fetchUploadedFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const data = await api.getRecords();
      const recordsList = data.records || data.data || (Array.isArray(data) ? data : []);
      const filesWithUploads = recordsList
        .filter((r) => r.data?.uploadedFile)
        .map((r) => ({
          ...r,
          fileType: r.type,
          uploadedAt: r.createdAt || r.data?.date,
        }));
      setFiles(filesWithUploads);
    } catch (error) {
      if (error?.status === 401 || isAuthError(error?.status, error?.message)) {
        handleSessionExpired();
      } else {
        console.error('Error fetching files:', error);
      }
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
      setUploadResult({
        success: true,
        filename: 'Google Drive connected successfully',
        size: 0,
        format: '',
        storedIn: 'drive',
        message: 'Your Google Drive is connected! Files will now be saved securely in your Drive FindMedi folder.',
      });
      setSearchParams({}, { replace: true });
      fetchDriveStatus();
    } else if (driveParam === 'error') {
      const reason = searchParams.get('reason') || 'Unknown error';
      setUploadResult({
        success: false,
        error: `Google Drive connection failed: ${reason}`,
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, fetchDriveStatus]);

  const getAcceptedTypes = () => {
    if (uploadType === 'xray') return 'image/*';
    if (uploadType === 'document') return '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx';
    return 'image/jpeg,image/png,image/webp';
  };

  const uploadSelectedFile = async (file) => {
    if (!file) return;

    if (!driveStatus.connected) {
      setUploadResult({
        success: false,
        error: 'Please connect your Google Drive first to upload medical files.',
      });
      return;
    }

    setLoading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', uploadType);

    try {
      const data = await api.dispatch(null, '/drive/upload', { method: 'POST', body: formData });

      if (!data || data.success === false) {
        setUploadResult({
          success: false,
          error: data?.error || data?.message || 'Google Drive upload failed',
        });
        setLoading(false);
        return;
      }

      setUploadResult({
        success: true,
        filename: data.filename || file.name,
        size: data.size || file.size,
        format: data.format || '',
        storedIn: 'drive',
      });

      fetchUploadedFiles();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      if (error?.status === 401 || isAuthError(error?.status, error?.message)) {
        handleSessionExpired();
      } else {
        setUploadResult({ success: false, error: error.message || 'Upload failed' });
      }
    }
    setLoading(false);
  };

  const handleFileInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) uploadSelectedFile(f);
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
    if (f) uploadSelectedFile(f);
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'lab_report') return <Image className="w-5 h-5 text-sky-500" />;
    if (fileType === 'discharge_summary') return <FileText className="w-5 h-5 text-emerald-500" />;
    if (fileType === 'prescription') return <FileText className="w-5 h-5 text-amber-500" />;
    return <FileText className="w-5 h-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '—';
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

  const filteredFiles = {
    images: files.filter((f) => f.fileType === 'lab_report'),
    documents: files.filter(
      (f) => f.fileType === 'discharge_summary' || f.fileType === 'prescription'
    ),
    all: files,
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
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-cyan-500/10 px-5 py-5 sm:px-8 sm:py-6 shadow-sm">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge variant="secondary" className="gap-1.5 font-medium text-xs bg-cyan-500/15 text-cyan-600 border border-cyan-500/20">
                <HardDrive className="w-3.5 h-3.5" />
                Google Drive Storage
              </Badge>
              <Badge variant="outline" className="gap-1 font-normal border-primary/30 text-[10px]">
                <ShieldCheck className="w-3 h-3 text-primary" />
                100% Private & Encrypted
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Medical File Upload
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl leading-relaxed">
              Upload your medical prescriptions, lab reports, and X-rays directly into your personal Google Drive for maximum security and ownership.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-lg border px-3 py-2 shrink-0 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>Direct to your Drive</span>
          </div>
        </div>

        {/* Google Drive Status Bar */}
        <div className="mt-4 p-4 rounded-xl bg-card border border-border/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${driveStatus.connected ? 'bg-emerald-500/15 text-emerald-600' : 'bg-cyan-500/15 text-cyan-600'}`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {driveStatus.connected ? 'Google Drive Connected' : 'Google Drive Required'}
                </p>
                {driveStatus.connected && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {driveStatus.connected
                  ? 'All files will be saved in your private Google Drive folder ("FindMedi").'
                  : 'Connect your Google Drive account to enable secure medical file uploads.'}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2 shrink-0">
            {driveStatus.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnectDrive}
                className="text-xs text-muted-foreground hover:text-destructive border-border hover:border-destructive/30 w-full sm:w-auto"
              >
                Disconnect Drive
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={connectDrive}
                disabled={driveLoading}
                className="text-xs gap-2 bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm w-full sm:w-auto"
              >
                {driveLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5" />
                )}
                Connect Google Drive
              </Button>
            )}
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
                    ? 'Uploaded to Google Drive'
                    : uploadResult.sessionExpired
                      ? 'Session needs refresh'
                      : 'Upload failed'}
                </p>
                {uploadResult.success ? (
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      <span className="text-foreground font-medium">File:</span> {uploadResult.filename}
                    </li>
                    {uploadResult.size > 0 && (
                      <li>
                        <span className="text-foreground font-medium">Size:</span>{' '}
                        {formatFileSize(uploadResult.size)}
                      </li>
                    )}
                    {uploadResult.format ? (
                      <li>
                        <span className="text-foreground font-medium">Format:</span>{' '}
                        {String(uploadResult.format).toUpperCase()}
                      </li>
                    ) : null}
                    <li>
                      <span className="text-foreground font-medium">Location:</span> Saved in Google Drive (`FindMedi` folder)
                    </li>
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
            My Drive Files ({files.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 mt-4">
          {!driveStatus.connected ? (
            /* Locked State Card */
            <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.04] to-transparent shadow-sm">
              <CardContent className="py-12 px-6 text-center max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 text-cyan-600 flex items-center justify-center mx-auto shadow-xs">
                  <HardDrive className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-foreground">Connect Google Drive to Upload</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    MediCore stores your medical uploads directly in your personal Google Drive. Connect your account in one click to enable uploading.
                  </p>
                </div>
                <Button
                  onClick={connectDrive}
                  disabled={driveLoading}
                  className="gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 shadow-md"
                >
                  {driveLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <HardDrive className="w-4 h-4" />
                  )}
                  Connect Google Drive Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Upload form when Drive IS connected */
            <Card className="overflow-hidden border-muted shadow-sm">
              <CardHeader className="space-y-0.5 pb-1">
                <CardTitle className="text-lg tracking-tight">
                  What are you uploading to Drive?
                </CardTitle>
                <CardDescription className="text-xs">Choose a category so we file it correctly in your Drive records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                        <p className="text-[11px] text-muted-foreground mt-0.5">{t.hint}</p>
                      </button>
                    );
                  })}
                </div>

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
                        relative rounded-xl border-2 border-dashed px-6 py-8 sm:py-10 text-center transition-all duration-300
                        ${isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-primary/25 bg-muted/30 hover:bg-primary/[0.06] hover:border-primary/50'}
                        ${loading ? 'pointer-events-none opacity-70' : ''}
                      `}
                    >
                      {loading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-background/70 backdrop-blur-[2px]">
                          <Loader2 className="w-8 h-8 animate-spin text-cyan-600 mb-1" />
                          <p className="text-xs font-medium text-foreground">Uploading directly to Google Drive…</p>
                        </div>
                      )}
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-base font-semibold tracking-tight text-foreground">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                        {uploadType === 'xray'
                          ? 'X-ray and scan images (common formats supported).'
                          : uploadType === 'document'
                            ? 'PDFs and scanned documents or photos of documents.'
                            : 'Clear photos of prescriptions, charts, or medical reports.'}
                      </p>
                      <p className="text-[11px] text-muted-foreground/80 mt-3">
                        Saved into your Google Drive (`FindMedi` folder) · max 25 MB
                      </p>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="myfiles" className="mt-4">
          {loadingFiles ? (
            <Card className="border-muted shadow-sm">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Loading your Drive files…</p>
              </CardContent>
            </Card>
          ) : filteredFiles.all.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/20">
              <CardContent className="py-16 text-center">
                <HardDrive className="w-14 h-14 mx-auto mb-4 text-muted-foreground/60" />
                <p className="text-lg font-semibold">No Google Drive files yet</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Connect your Google Drive and upload a document or image — it will be saved in your Drive and show up here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Images & X-rays', count: filteredFiles.images.length, icon: Image, tone: 'text-sky-500' },
                  { label: 'Documents', count: filteredFiles.documents.length, icon: FileText, tone: 'text-emerald-500' },
                  { label: 'Total Files', count: files.length, icon: HardDrive, tone: 'text-cyan-600' },
                ].map((s) => (
                  <Card key={s.label} className="shadow-sm border-muted/80 overflow-hidden">
                    <CardContent className="pt-6 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-3xl font-bold tabular-nums">{s.count}</p>
                        <p className="text-sm text-muted-foreground">{s.label}</p>
                      </div>
                      <s.icon className={`w-10 h-10 ${s.tone} opacity-90`} />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.all.map((file, idx) => (
                  <Card
                    key={file._id || idx}
                    className="group hover:shadow-lg hover:border-cyan-500/30 transition-all duration-200 border-muted/80"
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
                          {file.fileType?.replace('_', ' ') || 'File'}
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
                              <span className="text-muted-foreground">Type</span>
                              <span className="uppercase">{file.data.uploadedFile.format || 'file'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Storage</span>
                              <span className="flex items-center gap-1 text-cyan-600 font-medium">
                                <HardDrive className="w-3.5 h-3.5" />
                                Google Drive
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1.5" asChild>
                          <a href={getFileUrl(file)} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </a>
                        </Button>
                        <Button size="sm" className="flex-1 gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white" asChild>
                          <a href={getFileUrl(file)} download target="_blank" rel="noopener noreferrer">
                            <Download className="w-3.5 h-3.5" />
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
