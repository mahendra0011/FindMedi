import React, { useState, useEffect } from 'react';
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
import {
  CalendarDays,
  Clock,
  User,
  Users,
  UserPlus,
  Building,
  Phone,
  Loader2,
  ShieldCheck,
  HeartHandshake,
  Pill,
  ClipboardList,
  Bell,
  UserCog,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export const ASSISTANT_SERVICE_OPTIONS = [
  { id: 'Paperwork & Admission Help', label: 'Paperwork & Admission Help', icon: FileText },
  { id: 'Medicine Pickup', label: 'Medicine Pickup', icon: Pill },
  { id: 'Report Collection', label: 'Report Collection', icon: ClipboardList },
  { id: 'Errand & General Needs', label: 'Errand & General Needs', icon: Bell },
  { id: 'Full-Time Attendant', label: 'Full-Time Attendant', icon: UserCog },
  { id: 'Elderly/Special Care', label: 'Elderly/Special Care', icon: HeartHandshake },
];

export const STANDARD_TIME_SLOTS = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
];

interface AssistantScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistant: any;
  onSuccess?: (booking: any) => void;
}

export default function AssistantScheduleModal({
  open,
  onOpenChange,
  assistant,
  onSuccess,
}: AssistantScheduleModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [hospital, setHospital] = useState('');
  const [bookingFor, setBookingFor] = useState<'self' | 'family' | 'other'>('self');
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<any>(null);
  const [otherPatient, setOtherPatient] = useState({ name: '', phone: '', age: '' });

  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00 AM');
  const [durationType, setDurationType] = useState<'2hr' | '4hr' | 'full_day'>('4hr');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  useEffect(() => {
    if (open && assistant) {
      setBookingFor('self');
      setSelectedFamilyMember(null);
      setOtherPatient({ name: '', phone: '', age: '' });
      setSpecialInstructions('');
      setScheduledTime('10:00 AM');
      setDurationType('4hr');
      setPhone(user?.phone || '');

      // Tomorrow default date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);

      if (assistant.hospitalsCovered?.length > 0) {
        setHospital(assistant.hospitalsCovered[0]);
      } else {
        setHospital('');
      }

      if (assistant.serviceCategories?.length > 0) {
        setServiceCategories([assistant.serviceCategories[0]]);
      } else {
        setServiceCategories([ASSISTANT_SERVICE_OPTIONS[0].id]);
      }

      if (user) {
        api.getFamilyMembers()
          .then((res: any) => {
            const list = res?.members || (Array.isArray(res) ? res : []);
            setFamilyMembers(list);
          })
          .catch(() => setFamilyMembers([]));
      }
    }
  }, [open, assistant, user]);

  if (!assistant) return null;

  const toggleService = (srvId: string) => {
    setServiceCategories((prev) =>
      prev.includes(srvId) ? prev.filter((s) => s !== srvId) : [...prev, srvId]
    );
  };

  const ratePerHour = assistant.pricePerHour || 150;
  const hoursMap: Record<string, number> = { '2hr': 2, '4hr': 4, 'full_day': 8 };
  const hours = hoursMap[durationType] || 4;
  const totalCost = ratePerHour * hours;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospital) {
      toast.error('Please specify the hospital');
      return;
    }
    if (serviceCategories.length === 0) {
      toast.error('Please select at least one service category');
      return;
    }
    if (!scheduledDate) {
      toast.error('Please select the scheduled date');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setLoadingSubmit(true);
    try {
      const payload = {
        assistantId: assistant._id || assistant.assistantId,
        hospital,
        serviceCategories,
        scheduledDate,
        startTime: scheduledTime,
        durationType,
        durationNeeded: durationType,
        specialInstructions: specialInstructions.trim(),
        taskDescription: specialInstructions.trim(),
        phone: phone.trim(),
        onBehalfOf: bookingFor,
        familyMemberId: bookingFor === 'family' ? selectedFamilyMember?._id : null,
        otherPatient: bookingFor === 'other' ? otherPatient : {},
        isUrgent: false,
        targetAssistantOnly: true,
        intakeSource: 'scheduled_profile_form',
      };

      const res = await api.createAssistantBooking(payload);
      const createdBooking = res.booking || res;

      toast.success(`Assistance appointment requested with ${assistant.name}!`);
      onOpenChange(false);
      if (onSuccess) onSuccess(createdBooking);
      navigate(`/book-assistant?bookingId=${createdBooking._id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule assistant');
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border border-border/80 shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-indigo-700 via-indigo-600 to-primary p-6 text-white overflow-hidden rounded-t-3xl">
          <div className="relative z-10 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase">
              <CalendarDays className="w-3 h-3 text-white" />
              <span>Planned Hospital Visit</span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-white">
              Schedule Assistance with {assistant.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/90">
              Pick a hospital, scheduled date, and shift duration for reliable in-person assistance.
            </DialogDescription>
          </div>
          <HeartHandshake className="w-36 h-36 absolute -right-6 -bottom-8 text-white/10 pointer-events-none" />
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* 1. Hospital */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-primary" /> Hospital Location *
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
              <User className="w-3.5 h-3.5 text-primary" /> Patient / Booking For:
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

          {/* 3. Service Categories */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Services Needed *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ASSISTANT_SERVICE_OPTIONS.map((srv) => {
                const checked = serviceCategories.includes(srv.id);
                const Icon = srv.icon;
                return (
                  <div
                    key={srv.id}
                    onClick={() => toggleService(srv.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-center gap-2.5 text-xs font-semibold ${
                      checked
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleService(srv.id)} />
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{srv.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-primary" /> Scheduled Date *
              </label>
              <Input
                type="date"
                value={scheduledDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" /> Start Time *
              </label>
              <select
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold"
              >
                {STANDARD_TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Shift Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Shift Duration
            </label>
            <select
              value={durationType}
              onChange={(e) => setDurationType(e.target.value as any)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium"
            >
              <option value="2hr">2 Hours (Quick Assistance)</option>
              <option value="4hr">4 Hours (Half Day Shift)</option>
              <option value="full_day">Full Day (8 Hours Shift)</option>
            </select>
          </div>

          {/* 6. Special Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Special Instructions / Tasks</label>
            <Textarea
              rows={2}
              placeholder="e.g. Please bring patient wheelchair from Ground Floor and collect OPD file..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="text-xs rounded-xl resize-none"
            />
          </div>

          {/* 7. Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" /> Phone Number *
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

          {/* Fee Breakdown */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted-foreground">Estimated Fee</span>
              <div className="text-xs font-semibold text-foreground">
                {hours} hrs × ₹{ratePerHour}/hr
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black text-foreground">₹{totalCost}</div>
              <span className="text-[10px] text-emerald-600 font-semibold">Pay after service</span>
            </div>
          </div>

          {/* Footer */}
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
              disabled={loadingSubmit || serviceCategories.length === 0}
              className="rounded-xl text-xs h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2"
            >
              {loadingSubmit ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Scheduling...
                </>
              ) : (
                <>
                  <CalendarDays className="w-4 h-4" /> Schedule Assistance
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
