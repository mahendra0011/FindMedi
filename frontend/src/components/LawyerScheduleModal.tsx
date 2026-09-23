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
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  Clock,
  Scale,
  User,
  Users,
  UserPlus,
  Phone,
  Upload,
  X,
  FileText,
  Loader2,
  IndianRupee,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface LawyerScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lawyer: any;
  onSuccess?: (booking: any) => void;
}

export default function LawyerScheduleModal({
  open,
  onOpenChange,
  lawyer,
  onSuccess,
}: LawyerScheduleModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bookingFor, setBookingFor] = useState<'self' | 'family' | 'other'>('self');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<any>(null);
  const [otherPatient, setOtherPatient] = useState({ name: '', phone: '', age: '' });

  const [category, setCategory] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00 AM');
  const [consultationMode, setConsultationMode] = useState<'video' | 'phone' | 'in_person' | 'chat'>('in_person');
  const [locationAddress, setLocationAddress] = useState('');
  const [landmarkName, setLandmarkName] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && lawyer) {
      setBookingFor('self');
      setSelectedFamilyMember(null);
      setOtherPatient({ name: '', phone: '', age: '' });
      setCaseDescription('');
      setDocuments([]);
      setPhone(user?.phone || '');
      setLocationAddress(user?.address || '');
      setLandmarkName('');
      setCategory(lawyer.practiceCategories?.[0] || 'General Consultation');

      // Tomorrow as default scheduled date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);

      setConsultationMode('in_person');

      if (user) {
        api.getFamilyMembers()
          .then((res: any) => {
            const members = res?.members || (Array.isArray(res) ? res : []);
            setFamilyMembers(members);
          })
          .catch(() => setFamilyMembers([]));
      }
    }
  }, [open, lawyer, user]);

  if (!lawyer) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }
    setUploadingDoc(true);
    try {
      const res = await api.uploadFile(file, { purpose: 'legal_intake', createRecord: false });
      if (res?.url) {
        setDocuments((prev) => [...prev, res.url]);
        toast.success('Document attached');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeDoc = (idx: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to schedule a consultation');
      navigate('/login?redirect=/find-lawyer');
      return;
    }

    if (!caseDescription.trim() || caseDescription.trim().length < 10) {
      toast.error('Please describe your legal issue (at least 10 characters)');
      return;
    }

    if (!scheduledDate) {
      toast.error('Please select a date for your consultation');
      return;
    }

    if (!phone.trim()) {
      toast.error('Please provide a contact phone number');
      return;
    }

    if (consultationMode === 'in_person' && (!locationAddress || locationAddress.trim().length < 5)) {
      toast.error('Please specify the hospital or address for the advocate to visit');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        lawyerId: lawyer._id,
        bookingFor,
        familyMemberId: bookingFor === 'family' ? selectedFamilyMember?._id : undefined,
        otherPatient: bookingFor === 'other' ? otherPatient : undefined,
        category,
        caseDescription: caseDescription.trim(),
        consultationMode,
        contactMode: consultationMode,
        scheduledDate,
        scheduledTime,
        phone: phone.trim(),
        documents,
        isUrgent: false,
        targetLawyerOnly: true,
        intakeSource: 'scheduled_profile_form',
        fee: lawyer.consultationFee || 800,
        location: consultationMode === 'in_person' ? {
          address: locationAddress.trim(),
          landmarkName: landmarkName.trim() || undefined,
          city: lawyer.operatingCity || lawyer.jurisdictionCity || '',
        } : undefined,
      };

      const res = await api.createLawyerBooking(payload);
      const booking = res?.booking || res;

      toast.success(`Consultation scheduled with Adv. ${lawyer.name}!`);
      if (onSuccess) onSuccess(booking);
      onOpenChange(false);
      navigate(`/patient/lawyers?bookingId=${booking._id}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to schedule consultation');
    } finally {
      setSubmitting(false);
    }
  };

  const standardTimeSlots = [
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '02:00 PM',
    '03:30 PM',
    '05:00 PM',
    '06:00 PM',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl sm:rounded-3xl border-border bg-card">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-black via-slate-900 to-slate-800 text-white p-5 sm:p-6 rounded-t-2xl sm:rounded-t-3xl relative overflow-hidden">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase">
              <CalendarDays className="w-3.5 h-3.5" />
              Planned Legal Consultation
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-white">
              Schedule Consultation with Adv. {lawyer.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/90">
              Pick your preferred date and slot for a planned in-person legal consultation at your hospital or location.
            </DialogDescription>
          </div>
          <Scale className="w-32 h-32 absolute -right-4 -bottom-6 text-white/10 pointer-events-none" />
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Booking For */}
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

            {bookingFor === 'family' && familyMembers.length > 0 && (
              <select
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs mt-2"
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

            {bookingFor === 'other' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  placeholder="Person's Name *"
                  value={otherPatient.name}
                  onChange={(e) => setOtherPatient({ ...otherPatient, name: e.target.value })}
                  className="h-8 text-xs rounded-lg"
                />
                <Input
                  type="number"
                  placeholder="Age"
                  value={otherPatient.age}
                  onChange={(e) => setOtherPatient({ ...otherPatient, age: e.target.value })}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Legal Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Legal Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium"
            >
              {(lawyer.practiceCategories || ['General Consultation']).map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" /> Select Date *
              </label>
              <Input
                type="date"
                value={scheduledDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" /> Time Slot *
              </label>
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium"
              >
                {standardTimeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Selection */}
          {/* In-Person Meeting Location Fields — Always Required */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-slate-900/20 dark:border-white/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>Hospital / Meeting Location *</span>
              </label>
              <Badge className="bg-red-600 text-white text-[9px] py-0 px-2 h-4.5 font-semibold">
                In-Person Visit
              </Badge>
            </div>
            <Input
              value={locationAddress}
              onChange={(e) => setLocationAddress(e.target.value)}
              placeholder="e.g. City Hospital, OPD Consultation Room / 2nd Floor"
              className="h-9 text-xs rounded-lg"
            />
            <Input
              value={landmarkName}
              onChange={(e) => setLandmarkName(e.target.value)}
              placeholder="Landmark / Ward / Room No. (Optional)"
              className="h-8 text-xs rounded-lg bg-background"
            />
            <p className="text-[10px] text-muted-foreground">
              Advocate will physically meet you at this location on the scheduled date and time.
            </p>
          </div>

          {/* Issue Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Describe your legal matter *</label>
            <Textarea
              rows={3}
              placeholder="Provide background context regarding your hospital, insurance, or legal dispute..."
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              className="text-xs rounded-xl resize-none"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" /> Contact Phone Number *
            </label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          {/* Attach Documents */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" /> Attach Documents (Optional)
            </label>
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
                {uploadingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Attach Document
              </Button>
              {documents.map((docUrl, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-900/10 text-slate-900 dark:bg-white/10 dark:text-slate-100 border border-slate-900/20 dark:border-white/20"
                >
                  <FileText className="w-3 h-3" />
                  <span className="max-w-[120px] truncate">Document {idx + 1}</span>
                  <button type="button" onClick={() => removeDoc(idx)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Consultation Fee (Pay after session):</p>
              <p className="text-base font-bold text-foreground flex items-center gap-0.5">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>{lawyer.consultationFee || 800}</span>
                <span className="text-[11px] font-normal text-muted-foreground ml-1">/ 30 min session</span>
              </p>
            </div>
            <Badge variant="outline" className="bg-slate-900/5 text-slate-900 dark:text-slate-100 border-slate-900/20 dark:border-white/20 text-[10px]">
              <ShieldCheck className="w-3 h-3 mr-1" /> Confirmed Booking
            </Badge>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-5 sm:p-6 bg-muted/20 border-t border-border/40 flex sm:flex-row gap-2">
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
            className={`rounded-xl h-10 text-xs flex-1 font-bold gap-1.5 shadow-lg ${
              !caseDescription.trim() || !phone.trim() || !scheduledDate
                ? 'bg-slate-900/70 hover:bg-slate-900 text-white shadow-slate-900/10'
                : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/20'
            }`}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
            Confirm Consultation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
