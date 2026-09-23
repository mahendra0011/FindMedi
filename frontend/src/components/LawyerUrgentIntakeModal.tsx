import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Scale,
  Gavel,
  User,
  Users,
  UserPlus,
  MapPin,
  LocateFixed,
  Building,
  Phone,
  Upload,
  X,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export const LAWYER_CATEGORIES = [
  'Medical Negligence',
  'Insurance Disputes',
  'Accident & MLC',
  'Consumer Rights',
  'Family & Personal',
  'Criminal Law',
  'Civil & Property',
  'Corporate & Contract',
  'General Consultation',
];

interface LawyerUrgentIntakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lawyer?: any;
  broadcast?: boolean;
  onSuccess?: (booking: any) => void;
}

export default function LawyerUrgentIntakeModal({
  open,
  onOpenChange,
  lawyer = null,
  broadcast = false,
  onSuccess,
}: LawyerUrgentIntakeModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Location State ───
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>('auto');
  const [address, setAddress] = useState('');
  const [landmarkName, setLandmarkName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectedCity, setDetectedCity] = useState('Jabalpur');
  const [detectingLocation, setDetectingLocation] = useState(false);

  // ─── Booking State ───
  const [bookingFor, setBookingFor] = useState<'self' | 'family' | 'other'>('self');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<any>(null);
  const [fetchingFamily, setFetchingFamily] = useState(false);

  const [otherPatient, setOtherPatient] = useState({
    name: '',
    phone: '',
    age: '',
  });

  const [category, setCategory] = useState<string>('');
  const [caseDescription, setCaseDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [acknowledgeUrgent, setAcknowledgeUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-detect location function
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setLocationMode('manual');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        try {
          // Reverse-geocode via Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          if (res.ok) {
            const data = await res.json();
            const displayName = data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            setAddress(displayName);
            const city =
              data.address?.city ||
              data.address?.town ||
              data.address?.state_district ||
              data.address?.suburb ||
              'Jabalpur';
            setDetectedCity(city);
            toast.success(`Location detected: ${city}`);
          } else {
            setAddress(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
          }
        } catch {
          setAddress(`Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.warn('Geolocation failed:', err.message);
        setDetectingLocation(false);
        // Fallback to user address if available
        if (user?.address) {
          setAddress(user.address);
          toast.info('Using your registered profile address');
        } else {
          toast.error('Could not detect location. Please type your hospital/address manually.');
          setLocationMode('manual');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Initialize form when modal opens or lawyer changes
  useEffect(() => {
    if (open) {
      setLocationMode('auto');
      setAddress(user?.address || 'City Central Hospital, Wright Town, Jabalpur');
      setLandmarkName('');
      setCoords({ lat: 23.1815, lng: 79.9864 });
      setDetectedCity('Jabalpur');
      setBookingFor('self');
      setSelectedFamilyMember(null);
      setOtherPatient({ name: '', phone: '', age: '' });
      setCaseDescription('');
      setDocuments([]);
      setAcknowledgeUrgent(false);
      setSubmitting(false);
      setPhone(user?.phone || '');

      // Trigger auto-detection silently if user opens
      handleAutoDetectLocation();

      // Set category
      if (lawyer && lawyer.practiceCategories && lawyer.practiceCategories.length > 0) {
        setCategory(lawyer.practiceCategories[0]);
      } else {
        setCategory('Medical Negligence');
      }

      // Fetch user family members
      if (user) {
        setFetchingFamily(true);
        api.getFamilyMembers()
          .then((res: any) => {
            const members = res?.members || (Array.isArray(res) ? res : []);
            setFamilyMembers(members);
          })
          .catch(() => setFamilyMembers([]))
          .finally(() => setFetchingFamily(false));
      }
    }
  }, [open, lawyer, user]);

  // Handle file uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      e.target.value = '';
      return;
    }

    setUploadingDoc(true);
    try {
      const res = await api.uploadFile(file, { purpose: 'legal_intake', createRecord: false });
      if (res?.url) {
        setDocuments((prev) => [...prev, res.url]);
        toast.success('Document attached');
      } else {
        toast.error('Upload succeeded but no URL was returned');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeDoc = (indexToRemove: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Submit Urgent Consultation Request
  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to book an urgent consultation');
      navigate('/login?redirect=/find-lawyer');
      return;
    }

    if (!address.trim()) {
      toast.error('Please specify the location or hospital for the lawyer to come');
      return;
    }

    if (!caseDescription.trim() || caseDescription.trim().length < 10) {
      toast.error('Please briefly describe your legal issue (at least 10 characters)');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please provide a contact phone number');
      return;
    }

    if (!acknowledgeUrgent) {
      toast.error('Please acknowledge the urgent consultation terms');
      return;
    }

    if (bookingFor === 'other' && !otherPatient.name.trim()) {
      toast.error("Please enter the person's name");
      return;
    }

    try {
      setSubmitting(true);
      const isTargeted = Boolean(lawyer && !broadcast);

      const payload = {
        lawyerId: isTargeted ? lawyer._id : undefined,
        bookingFor,
        familyMemberId: bookingFor === 'family' ? selectedFamilyMember?._id : undefined,
        otherPatient: bookingFor === 'other' ? otherPatient : undefined,
        category,
        caseDescription: caseDescription.trim(),
        contactMode,
        phone: phone.trim(),
        documents,
        isUrgent: true,
        targetLawyerOnly: isTargeted,
        intakeSource: 'quick_urgent_card',
        fee: isTargeted ? (lawyer.consultationFee || 800) : 800,
        acknowledgeUrgent: true,
        location: {
          address: address.trim(),
          lat: coords?.lat || 23.1815,
          lng: coords?.lng || 79.9864,
          landmarkName: landmarkName.trim() || undefined,
          city: detectedCity,
        },
      };

      const res = await api.createLawyerBooking(payload);
      const booking = res?.booking || res;

      toast.success(
        isTargeted
          ? `Urgent request sent to Adv. ${lawyer.name}! Advocate will head to your location once accepted.`
          : 'Urgent request broadcasted to all available advocates in this city!'
      );

      if (onSuccess) {
        onSuccess(booking);
      }

      onOpenChange(false);
      navigate(`/patient/lawyers?bookingId=${booking._id}`);
    } catch (err: any) {
      console.error('Urgent booking failed:', err);
      toast.error(err?.message || 'Failed to submit urgent consultation request');
    } finally {
      setSubmitting(false);
    }
  };

  const isTargeted = Boolean(lawyer && !broadcast);
  const targetLawyerName = lawyer?.name || '';
  const estimatedFee = isTargeted ? (lawyer.consultationFee || 800) : 800;
  const lawyerCity = lawyer?.operatingCity || lawyer?.jurisdictionCity || '';

  // Soft warning if targeted lawyer operates in a different city
  const isCityMismatch =
    isTargeted &&
    lawyerCity &&
    detectedCity &&
    !lawyerCity.toLowerCase().includes(detectedCity.toLowerCase()) &&
    !detectedCity.toLowerCase().includes(lawyerCity.toLowerCase());

  // Consultation is strictly In-Person physical visit to location
  const contactMode = 'in_person';

  // Available categories for this modal
  const selectableCategories =
    isTargeted && lawyer?.practiceCategories?.length > 0
      ? lawyer.practiceCategories
      : LAWYER_CATEGORIES;

  const isFormValid =
    address.trim().length >= 5 &&
    caseDescription.trim().length >= 10 &&
    phone.trim().length >= 6 &&
    acknowledgeUrgent &&
    (bookingFor !== 'other' || Boolean(otherPatient.name.trim()));

  // Dynamic hint — which fields still block the request (button stays clickable,
  // handleSubmit() shows the exact toast for the first missing field)
  const missingFields: string[] = [];
  if (address.trim().length < 5) missingFields.push('pickup location / hospital');
  if (caseDescription.trim().length < 10) missingFields.push('issue description (min 10 chars)');
  if (phone.trim().length < 6) missingFields.push('contact phone number');
  if (!acknowledgeUrgent) missingFields.push('acknowledgment checkbox');
  if (bookingFor === 'other' && !otherPatient.name.trim()) missingFields.push("patient's name");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl sm:rounded-3xl border-border bg-card shadow-2xl">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-5 sm:p-6 rounded-t-2xl sm:rounded-t-3xl relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase">
              <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              ⚡ Instant Dispatch — Call Lawyer to Location
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              {isTargeted ? `Book Urgent — Adv. ${targetLawyerName}` : 'Need Urgent Legal Help — Call Any Available Lawyer'}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/95 font-medium">
              ⚡ Lawyer will head to your location once they accept the request
            </DialogDescription>
          </div>
          <Gavel className="w-32 h-32 absolute -right-4 -bottom-6 text-white/10 pointer-events-none" />
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Lawyer Offline Alert — request is still queued & delivered */}
          {isTargeted && lawyer.isAvailable === false && (
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Adv. {targetLawyerName} is currently offline / in court.</p>
                <p className="text-[11px] opacity-90">
                  Aap phir bhi request bhej sakte hain — booking turant create hogi aur advocate ke legal console
                  par queue ho jayegi with an instant notification. Aap chahein to "Need Urgent Help" banner se
                  isi city ke doosre online advocates ko bhi broadcast kar sakte hain.
                </p>
              </div>
            </div>
          )}

          {/* City Mismatch Soft Warning (CB01 §2.3) */}
          {isCityMismatch && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">City Notice:</span> Adv. {targetLawyerName} usually operates in <strong>{lawyerCity}</strong>; your location appears to be in <strong>{detectedCity}</strong>. They may not be able to come in person or travel time may be longer.
              </div>
            </div>
          )}

          {/* 1. 📍 Location Field (Required, Front-and-Center) */}
          <div className="space-y-2 p-4 rounded-2xl bg-muted/40 border border-slate-900/20 dark:border-white/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-600" />
                <span>📍 Location — Where should the lawyer come? *</span>
              </label>
              <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50 dark:bg-red-950/40">
                Required for In-Person
              </Badge>
            </div>

            {/* Location mode radio */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setLocationMode('auto');
                  handleAutoDetectLocation();
                }}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all ${
                  locationMode === 'auto'
                    ? 'border-slate-900 bg-slate-900/10 text-slate-900 dark:bg-white/10 dark:text-slate-100 font-bold shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <LocateFixed className="w-3.5 h-3.5" />
                <span>Use Current Location / Hospital</span>
              </button>

              <button
                type="button"
                onClick={() => setLocationMode('manual')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all ${
                  locationMode === 'manual'
                    ? 'border-slate-900 bg-slate-900/10 text-slate-900 dark:bg-white/10 dark:text-slate-100 font-bold shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Enter Address Manually</span>
              </button>
            </div>

            {/* Address Input */}
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. City Central Hospital, ICU Ward / Wright Town, Jabalpur"
                  className="h-10 text-xs rounded-xl pr-10"
                />
                {detectingLocation && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-slate-900 dark:text-slate-100 animate-spin" />
                  </div>
                )}
              </div>

              {/* Landmark / Hospital Name input */}
              <Input
                value={landmarkName}
                onChange={(e) => setLandmarkName(e.target.value)}
                placeholder="Hospital Name / Floor / Ward / Landmark (Optional)"
                className="h-8 text-xs rounded-lg bg-background"
              />
            </div>
          </div>

          {/* 2. Booking For */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" /> Booking For:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'self', label: 'Myself', icon: User },
                { id: 'family', label: 'Family Member', icon: Users },
                { id: 'other', label: 'Someone Else', icon: UserPlus },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setBookingFor(opt.id as any);
                    if (opt.id !== 'family') setSelectedFamilyMember(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                    bookingFor === opt.id
                      ? 'border-slate-900 bg-slate-900/10 text-slate-900 dark:bg-white/10 dark:text-slate-100 font-bold shadow-sm'
                      : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* If Family Member */}
            {bookingFor === 'family' && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2 animate-in fade-in slide-in-from-top-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Select Saved Family Member:</label>
                {fetchingFamily ? (
                  <div className="text-xs text-muted-foreground py-2 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading family members...
                  </div>
                ) : familyMembers.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-1">
                    No saved family members found. You can enter details manually under "Someone Else".
                  </div>
                ) : (
                  <select
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs"
                    value={selectedFamilyMember?._id || ''}
                    onChange={(e) => {
                      const m = familyMembers.find((item) => item._id === e.target.value);
                      setSelectedFamilyMember(m || null);
                    }}
                  >
                    <option value="">-- Choose Family Member --</option>
                    {familyMembers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.relation || 'Family'})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* If Someone Else */}
            {bookingFor === 'other' && (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2 animate-in fade-in slide-in-from-top-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Person's Full Name *</label>
                    <Input
                      placeholder="e.g. Ramesh Kumar"
                      value={otherPatient.name}
                      onChange={(e) => setOtherPatient({ ...otherPatient, name: e.target.value })}
                      className="h-8 text-xs rounded-lg mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Age (Optional)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 45"
                      value={otherPatient.age}
                      onChange={(e) => setOtherPatient({ ...otherPatient, age: e.target.value })}
                      className="h-8 text-xs rounded-lg mt-0.5"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Legal Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" /> Legal Category *
              </span>
              {isTargeted && (
                <span className="text-[10px] text-muted-foreground font-normal">
                  Advocate's Practice Areas
                </span>
              )}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-slate-900/20"
            >
              {selectableCategories.map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Briefly describe your issue */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                Briefly describe your issue *
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {caseDescription.length}/500
              </span>
            </div>
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="e.g. Hospital is refusing to release discharge papers without extra disputed payment, need urgent advocate representation..."
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              className="text-xs rounded-xl resize-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          {/* 5. Service Mode — Strictly Physical In-Person Visit */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-500/10 via-red-500/5 to-amber-500/10 border border-red-500/20 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  Physical In-Person Visit
                </span>
                <Badge className="bg-red-600 text-white text-[9px] py-0 px-2 h-4.5 font-semibold">
                  Lawyer Comes to You
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Advocate will physically travel and arrive at your specified hospital/location once accepted.
              </p>
            </div>
          </div>

          {/* 6. Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" /> Your Phone Number *
            </label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          {/* 7. Attach Documents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" /> Attach Documents (Optional)
              </label>
              <span className="text-[10px] text-muted-foreground">Max 25MB each</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDoc}
                className="h-8 rounded-xl text-xs gap-1.5 border-dashed"
              >
                {uploadingDoc ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> + Upload Document
                  </>
                )}
              </Button>

              {documents.map((docUrl, idx) => {
                const name = docUrl.split('/').pop() || `Doc ${idx + 1}`;
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-900/10 text-slate-900 dark:bg-white/10 dark:text-slate-100 border border-slate-900/20 dark:border-white/20"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="max-w-[120px] truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => removeDoc(idx)}
                      className="text-slate-900 dark:text-slate-100/70 hover:text-slate-900 dark:hover:text-white ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* 8. Estimated Fee Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Estimated Fee (Payable after session completes):</p>
              <p className="text-base font-bold text-foreground flex items-center gap-0.5">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>{estimatedFee}</span>
                <span className="text-[11px] font-normal text-muted-foreground ml-1">
                  {isTargeted ? `(Adv. ${targetLawyerName}'s rate)` : '(Standard urgent intake rate)'}
                </span>
              </p>
            </div>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
              <ShieldCheck className="w-3 h-3 mr-1" /> Post-Pay Safe
            </Badge>
          </div>

          {/* 9. Mandatory Acknowledgment Checkbox */}
          <div className="flex items-start gap-2.5 pt-1">
            <Checkbox
              id="acknowledgeUrgent"
              checked={acknowledgeUrgent}
              onCheckedChange={(checked) => setAcknowledgeUrgent(Boolean(checked))}
              className="mt-0.5"
            />
            <label
              htmlFor="acknowledgeUrgent"
              className="text-xs text-muted-foreground leading-snug cursor-pointer select-none"
            >
              I understand this is an urgent request and the lawyer may not always be reachable instantly. Once accepted, they will proceed to my location.
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-5 sm:p-6 bg-muted/20 border-t border-border/40 flex sm:flex-col gap-2">
          {!isFormValid && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug order-2 sm:order-1">
              ⚠ Fill: <span className="font-semibold">{missingFields.join(', ')}</span> — click the button anyway
              and we&apos;ll show exactly what&apos;s pending.
            </p>
          )}
          <div className="flex gap-2 order-1 sm:order-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-xl h-10 text-xs flex-1"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`rounded-xl h-10 text-xs flex-1 shadow-lg font-bold gap-1.5 ${
                isFormValid
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                  : 'bg-red-600/70 hover:bg-red-600 text-white shadow-red-500/10'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending Urgent Request...
                </>
              ) : (
                <>
                <Gavel className="w-4 h-4" /> Send Urgent Request
              </>
            )}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
