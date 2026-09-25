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
  Clock,
  User,
  Users,
  UserPlus,
  MapPin,
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
  HeartHandshake,
  Pill,
  ClipboardList,
  Bell,
  UserCog,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export const ASSISTANT_SERVICE_OPTIONS = [
  { id: 'Paperwork & Admission Help', label: 'Paperwork & Admission Help', icon: FileText, desc: 'Counter queues, form submission, billing' },
  { id: 'Medicine Pickup', label: 'Medicine Pickup', icon: Pill, desc: 'Pharmacy collection, delivery to bed' },
  { id: 'Report Collection', label: 'Report Collection', icon: ClipboardList, desc: 'Pathology & radiology sample/report handover' },
  { id: 'Errand & General Needs', label: 'Errand & General Needs', icon: Bell, desc: 'Food, attendant rotation, emergency supply' },
  { id: 'Full-Time Attendant', label: 'Full-Time Attendant', icon: UserCog, desc: 'Continuous bedside assistance & observation' },
  { id: 'Elderly/Special Care', label: 'Elderly/Special Care', icon: HeartHandshake, desc: 'Wheelchair guidance, gentle patient support' },
];



interface AssistantUrgentIntakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistant?: any;
  hospital?: string;
  broadcast?: boolean;
  initialCategory?: string;
  onSuccess?: (booking: any) => void;
}

export default function AssistantUrgentIntakeModal({
  open,
  onOpenChange,
  assistant,
  hospital: initialHospital = '',
  broadcast = false,
  initialCategory,
  onSuccess,
}: AssistantUrgentIntakeModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isTargeted = Boolean(assistant && !broadcast);

  // Form State
  const [hospital, setHospital] = useState('');
  const [bookingFor, setBookingFor] = useState<'self' | 'family' | 'other'>('self');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<any>(null);
  const [otherPatient, setOtherPatient] = useState({ name: '', phone: '', age: '' });

  const [servicesNeeded, setServicesNeeded] = useState<string[]>([]);
  const [taskDescription, setTaskDescription] = useState('');
  // Spec 07: patient allergy profile surfaced on the assistant alert.
  const [patientAllergies, setPatientAllergies] = useState('');
  const [urgencyWindow, setUrgencyWindow] = useState<'asap' | 'specific_time'>('asap');
  const [specificTime, setSpecificTime] = useState('11:00 AM');
  const [durationNeeded, setDurationNeeded] = useState<'2hr' | '4hr' | 'full_day'>('2hr');
  const [phone, setPhone] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [acknowledgeUrgent, setAcknowledgeUrgent] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setBookingFor('self');
      setSelectedFamilyMember(null);
      setOtherPatient({ name: '', phone: '', age: '' });
      setTaskDescription('');
      setPatientAllergies('');
      setUrgencyWindow('asap');
      setDurationNeeded('2hr');
      setDocuments([]);
      setAcknowledgeUrgent(false);
      setPhone(user?.phone || '');

      // Hospital pre-fill logic
      if (initialHospital) {
        setHospital(initialHospital);
      } else if (assistant?.hospitalsCovered?.length > 0) {
        setHospital(assistant.hospitalsCovered[0]);
      } else {
        setHospital('');
      }

      // Pre-check category
      if (initialCategory && initialCategory !== 'All') {
        setServicesNeeded([initialCategory]);
      } else if (assistant?.serviceCategories?.length > 0) {
        setServicesNeeded([assistant.serviceCategories[0]]);
      } else {
        setServicesNeeded([ASSISTANT_SERVICE_OPTIONS[0].id]);
      }

      // Load family members if logged in
      if (user) {
        api.getFamilyMembers()
          .then((res: any) => {
            const list = res?.members || (Array.isArray(res) ? res : []);
            setFamilyMembers(list);
          })
          .catch(() => setFamilyMembers([]));
      }
    }
  }, [open, assistant, initialHospital, initialCategory, user]);

  const toggleService = (serviceId: string) => {
    setServicesNeeded((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File exceeds 25MB limit.');
      return;
    }

    setUploadingDoc(true);
    try {
      if (api.uploadFile) {
        const res = await api.uploadFile(file, 'assistant_intake');
        if (res?.url) {
          setDocuments((prev) => [...prev, res.url]);
          toast.success('Document attached.');
        } else {
          setDocuments((prev) => [...prev, URL.createObjectURL(file)]);
          toast.success('Document uploaded.');
        }
      } else {
        setDocuments((prev) => [...prev, URL.createObjectURL(file)]);
        toast.success('Document uploaded.');
      }
    } catch (err: any) {
      toast.error('Upload failed. Attaching preview.');
      setDocuments((prev) => [...prev, URL.createObjectURL(file)]);
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeDoc = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Cost calculation
  const ratePerHour = assistant?.pricePerHour || 150;
  const hoursMap: Record<string, number> = { '2hr': 2, '4hr': 4, 'full_day': 8 };
  const hours = hoursMap[durationNeeded] || 2;
  const estimatedCost = ratePerHour * hours;



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospital) {
      toast.error('Please select the hospital location');
      return;
    }
    if (servicesNeeded.length === 0) {
      toast.error('Please select at least one service needed');
      return;
    }
    if (!taskDescription.trim() || taskDescription.trim().length < 10) {
      toast.error('Please briefly describe what you need help with (min 10 characters)');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter a contact phone number');
      return;
    }
    if (!acknowledgeUrgent) {
      toast.error('Please acknowledge the urgent request terms');
      return;
    }

    setLoadingSubmit(true);
    try {
      const payload = {
        assistantId: isTargeted ? (assistant._id || assistant.assistantId) : null,
        hospital,
        serviceCategories: servicesNeeded,
        taskDescription: taskDescription.trim(),
        specialInstructions: taskDescription.trim(),
        patientAllergies: patientAllergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        urgencyWindow,
        startTime: urgencyWindow === 'asap' ? 'ASAP' : specificTime,
        scheduledDate: new Date().toISOString().split('T')[0],
        durationType: durationNeeded,
        durationNeeded,
        phone: phone.trim(),
        documents,
        onBehalfOf: bookingFor,
        familyMemberId: bookingFor === 'family' ? selectedFamilyMember?._id : null,
        otherPatient: bookingFor === 'other' ? otherPatient : {},
        isUrgent: true,
        targetAssistantOnly: isTargeted,
        intakeSource: 'quick_urgent_card',
      };

      const res = await api.createAssistantBooking(payload);
      const createdBooking = res.booking || res;

      toast.success(
        isTargeted
          ? `Urgent request sent to ${assistant.name}! Waiting for response.`
          : `Urgent request broadcasted to available assistants at ${hospital}!`
      );

      onOpenChange(false);
      if (onSuccess) onSuccess(createdBooking);
      navigate(`/book-assistant?bookingId=${createdBooking._id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit urgent request');
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border border-border/80 shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-red-600 via-red-500 to-amber-600 p-6 text-white overflow-hidden rounded-t-3xl">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase">
              <Zap className="w-3 h-3 text-yellow-300 animate-pulse" />
              <span>Urgent Assistance Request</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-white">
              {isTargeted ? `Book Urgent with ${assistant.name}` : 'Need an Assistant Urgently'}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/90">
              ⚡ Verified hospital attendant dispatched on-demand to handle patient admission, paperwork, and rounds.
            </DialogDescription>
          </div>
          <HeartHandshake className="w-36 h-36 absolute -right-6 -bottom-8 text-white/10 pointer-events-none" />
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* 1. Hospital Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-red-600" />
              <span>Hospital Location *</span>
            </label>
            <input
              type="text"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              placeholder="Enter hospital or clinic name"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* 2. Patient / Booking For */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" /> Patient / On Whose Behalf:
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
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
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
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Name *</label>
                    <Input
                      placeholder="e.g. Ramesh Kumar"
                      value={otherPatient.name}
                      onChange={(e) => setOtherPatient({ ...otherPatient, name: e.target.value })}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground">Age</label>
                    <Input
                      type="number"
                      placeholder="e.g. 55"
                      value={otherPatient.age}
                      onChange={(e) => setOtherPatient({ ...otherPatient, age: e.target.value })}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Services Needed (Multi-select) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-primary" /> Service(s) Needed *
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">Select all that apply</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ASSISTANT_SERVICE_OPTIONS.map((srv) => {
                const checked = servicesNeeded.includes(srv.id);
                const Icon = srv.icon;
                return (
                  <div
                    key={srv.id}
                    onClick={() => toggleService(srv.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2.5 ${
                      checked
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleService(srv.id)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{srv.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {srv.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Task Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">
                What do you need help with right now? *
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {taskDescription.length}/500
              </span>
            </div>
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="e.g. Need someone to submit admission form at Counter 3, collect father's blood report from Lab 2, and guide through OPD..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="text-xs rounded-xl resize-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* 4b. Patient allergies (optional, shown to attendant) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Patient allergies <span className="font-normal text-muted-foreground">(optional, comma-separated)</span>
            </label>
            <Input
              placeholder="e.g. Penicillin, Dust, Peanuts"
              value={patientAllergies}
              onChange={(e) => setPatientAllergies(e.target.value)}
              className="text-xs rounded-xl h-10"
            />
          </div>

          {/* 5. Urgency Window & Estimated Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> How soon do you need them? *
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setUrgencyWindow('asap')}
                  className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all ${
                    urgencyWindow === 'asap'
                      ? 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold'
                      : 'border-border/60 bg-muted/20 text-muted-foreground'
                  }`}
                >
                  ⚡ ASAP (Within 1 hr)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgencyWindow('specific_time')}
                  className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition-all ${
                    urgencyWindow === 'specific_time'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border/60 bg-muted/20 text-muted-foreground'
                  }`}
                >
                  Specific Window
                </button>
              </div>
              {urgencyWindow === 'specific_time' && (
                <Input
                  placeholder="e.g. In 2 hours (2:30 PM)"
                  value={specificTime}
                  onChange={(e) => setSpecificTime(e.target.value)}
                  className="h-8 text-xs rounded-lg mt-1"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Estimated Duration:
              </label>
              <select
                value={durationNeeded}
                onChange={(e) => setDurationNeeded(e.target.value as any)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium"
              >
                <option value="2hr">2 Hours (Quick Assist)</option>
                <option value="4hr">4 Hours (Half Day Shift)</option>
                <option value="full_day">Full Day (8 Hours Shift)</option>
              </select>
            </div>
          </div>

          {/* 6. Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" /> Contact Phone Number *
            </label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 text-xs rounded-xl"
              required
            />
          </div>

          {/* 7. Document Upload (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" /> Attach Prescription / Discharge Slip (Optional)
              </label>
              <span className="text-[10px] text-muted-foreground">Max 25MB</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
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
                    <Upload className="w-3.5 h-3.5" /> + Attach File
                  </>
                )}
              </Button>

              {documents.map((docUrl, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20"
                >
                  <FileText className="w-3 h-3" />
                  <span className="max-w-[120px] truncate">Document {idx + 1}</span>
                  <button type="button" onClick={() => removeDoc(idx)} className="text-primary/70 hover:text-primary ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 8. Rate & Estimated Cost Card */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted-foreground">Estimated Rate Breakdown</span>
              <div className="text-xs font-semibold text-foreground">
                {hours} hrs × ₹{ratePerHour}/hr
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-foreground">₹{estimatedCost}</div>
              <span className="text-[10px] text-emerald-600 font-semibold">Pay after completion</span>
            </div>
          </div>

          {/* 9. Urgent Acknowledgment */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer">
            <Checkbox
              checked={acknowledgeUrgent}
              onCheckedChange={(c) => setAcknowledgeUrgent(Boolean(c))}
              className="mt-0.5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
            />
            <div className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
              I understand this is an urgent physical request and the assistant will be notified immediately to report to{' '}
              <span className="font-bold underline">{hospital || 'the hospital'}</span>.
            </div>
          </label>

          {/* Footer Buttons */}
          <DialogFooter className="flex gap-2 pt-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-10"
              disabled={loadingSubmit}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loadingSubmit || !acknowledgeUrgent || servicesNeeded.length === 0}
              className="rounded-xl text-xs h-10 font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 gap-2"
            >
              {loadingSubmit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Send Urgent Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
