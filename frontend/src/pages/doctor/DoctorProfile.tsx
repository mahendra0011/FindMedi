import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Stethoscope, Award, Clock, Hash, Save, Upload, AlertCircle, CheckCircle, Camera, Pen, Building2, Sun, Image, Pill, Shield, HelpCircle, CalendarDays, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

function MyAutoConfirmToggle() {
  const [value, setValue] = useState(true);
  const [maxSlot, setMaxSlot] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getMyAutoConfirm(), api.getMySlotCapacity()])
      .then(([ac, sc]) => { setValue(ac.autoConfirmAppointment !== false); setMaxSlot(sc.maxBookingsPerSlot || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !value;
    setSaving(true); setValue(next);
    try { await api.updateMyAutoConfirm(next); toast.success('Setting updated'); }
    catch { toast.error('Failed to update'); setValue(!next); }
    setSaving(false);
  };

  const saveSlotCapacity = async (n) => {
    setMaxSlot(n);
    try { await api.updateMySlotCapacity(n); toast.success('Slot capacity updated'); }
    catch { toast.error('Failed to update slot capacity'); }
  };

  if (loading) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-sm text-foreground">Auto-Confirm My Appointments</p>
          <p className="text-xs text-muted-foreground">ON par payment ke baad turant confirm; OFF par manually confirm karna hoga.</p>
        </div>
        <Switch checked={value} disabled={saving} onCheckedChange={toggle} />
      </div>
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
        <div>
          <p className="font-medium text-sm text-foreground">Patients Per Time Slot</p>
          <p className="text-xs text-muted-foreground">Apne consultation time ke hisaab se — ek slot me kitne patients book ho sakte hain.</p>
        </div>
        <Input type="number" min={1} max={20} className="w-20" value={maxSlot} onChange={e => saveSlotCapacity(Number(e.target.value))} />
      </div>
    </div>
  );
}

export default function DoctorProfile() {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [bio, setBio] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [avatar, setAvatar] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [emergencyOnCall, setEmergencyOnCall] = useState(false);
  const [refundGuarantee, setRefundGuarantee] = useState('auto-refund');
  const [videoFee, setVideoFee] = useState('');
  const [inPersonFee, setInPersonFee] = useState('');
  const [emergencyFee, setEmergencyFee] = useState('');
  const [followUpFee, setFollowUpFee] = useState('');
  const [followUpWindow, setFollowUpWindow] = useState('7 Days');
  const [bufferTime, setBufferTime] = useState('5 min');
  const [vacationFrom, setVacationFrom] = useState('');
  const [vacationTo, setVacationTo] = useState('');
  const [vacationReason, setVacationReason] = useState('');
  const [councilName, setCouncilName] = useState('');
  const [councilRegNo, setCouncilRegNo] = useState('');
  const [councilYear, setCouncilYear] = useState('');
  const [payoutUpi, setPayoutUpi] = useState('');
  const [payoutAccount, setPayoutAccount] = useState('');
  const [payoutIfsc, setPayoutIfsc] = useState('');

  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicLicense, setClinicLicense] = useState('');
  const [establishedYear, setEstablishedYear] = useState('');
  const [clinicTimingMon, setClinicTimingMon] = useState('');
  const [clinicTimingTue, setClinicTimingTue] = useState('');
  const [clinicTimingWed, setClinicTimingWed] = useState('');
  const [clinicTimingThu, setClinicTimingThu] = useState('');
  const [clinicTimingFri, setClinicTimingFri] = useState('');
  const [clinicTimingSat, setClinicTimingSat] = useState('');
  const [clinicTimingSun, setClinicTimingSun] = useState('');
  const [clinicFacilities, setClinicFacilities] = useState('');
  const [clinicTreatments, setClinicTreatments] = useState('');
  const [clinicInsurance, setClinicInsurance] = useState('');
  const [hospitalDept, setHospitalDept] = useState('');
  const [hospitalOpdTiming, setHospitalOpdTiming] = useState('');
  const [hospitalPaymentModes, setHospitalPaymentModes] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doctors = (await api.getDoctors())?.data || [];
        const myDoc = doctors.find(d => d.email === user?.email) || doctors.find(d => d.name?.includes(user?.name)) || null;
        if (myDoc) {
          setDoctor(myDoc);
          setBio(myDoc.bio || '');
          setQualification(myDoc.qualifications || '');
          setExperience(myDoc.experience || '');
          setPhone(myDoc.phone || '');
          setAddress(myDoc.location || '');
          setConsultationFee(myDoc.consultation_fees || myDoc.fees || '');
          setAvatar(myDoc.avatar || '');
          setSignatureUrl(myDoc.signatureUrl || '');
          // §8 settings live under settings.* (flat legacy keys as fallback).
          const st = myDoc.settings || {};
          const pick = (k, fb = '') => (st[k] !== undefined && st[k] !== '' ? st[k] : (myDoc[k] !== undefined && myDoc[k] !== '' ? myDoc[k] : fb));
          setEmergencyOnCall(Boolean(st.emergencyOnCall ?? myDoc.emergencyOnCall ?? false));
          setRefundGuarantee(pick('refundGuarantee', 'auto-refund'));
          setVideoFee(String(pick('videoFee', myDoc.video_fee || '')));
          setInPersonFee(String(pick('inPersonFee', myDoc.offline_fee || '')));
          setEmergencyFee(String(pick('emergencyFee', myDoc.emergency_fee || '')));
          setFollowUpFee(String(pick('followUpFee', '')));
          setFollowUpWindow(String(pick('followUpWindow', '7 Days')));
          setBufferTime(String(pick('bufferTime', '5 min')));
          setVacationFrom(String(pick('vacationFrom', '')));
          setVacationTo(String(pick('vacationTo', '')));
          setVacationReason(String(pick('vacationReason', '')));
          setCouncilName(String(pick('councilName', '')));
          setCouncilRegNo(String(pick('councilRegNo', '')));
          setCouncilYear(String(pick('councilYear', '')));
          setPayoutUpi(String(pick('payoutUpi', '')));
          setPayoutAccount(String(pick('payoutAccount', '')));
          setPayoutIfsc(String(pick('payoutIfsc', '')));
          const cp = myDoc.clinicProfile || {};
          setClinicName(cp.clinic_name || '');
          setClinicAddress(cp.clinic_address || '');
          setClinicLicense(cp.clinic_license || '');
          setEstablishedYear(cp.established_year ? String(cp.established_year) : '');
          const t = cp.clinic_timing || {};
          setClinicTimingMon(t.mon || '');
          setClinicTimingTue(t.tue || '');
          setClinicTimingWed(t.wed || '');
          setClinicTimingThu(t.thu || '');
          setClinicTimingFri(t.fri || '');
          setClinicTimingSat(t.sat || '');
          setClinicTimingSun(t.sun || '');
          setClinicFacilities((cp.clinic_facilities || []).join(', '));
          setClinicTreatments((cp.clinic_treatments || []).join(', '));
          setClinicInsurance((cp.clinic_insurance || []).join(', '));
        }
      } catch (e) { toast.error(e.message); }
      setLoading(false);
    };
    load();
  }, [user?.email, user?.name]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { bio, qualifications: qualification, experience, phone, location: address, consultation_fees: consultationFee ? Number(consultationFee) : 0, avatar,
        emergencyOnCall, refundGuarantee, videoFee: videoFee ? Number(videoFee) : 0, inPersonFee: inPersonFee ? Number(inPersonFee) : 0,
        emergencyFee: emergencyFee ? Number(emergencyFee) : 0, followUpFee, followUpWindow, bufferTime,
        vacationFrom, vacationTo, vacationReason, councilName, councilRegNo, councilYear,
        payoutUpi, payoutAccount, payoutIfsc };
      if (doctor) {
        await api.updateDoctor(doctor._id, body);
        if (doctor.doctor_type === 'clinic') {
          await api.updateDoctorClinicProfile(doctor._id, {
            clinic_name: clinicName,
            clinic_address: clinicAddress,
            clinic_license: clinicLicense,
            established_year: establishedYear ? parseInt(establishedYear) : null,
            clinic_timing: {
              mon: clinicTimingMon, tue: clinicTimingTue, wed: clinicTimingWed,
              thu: clinicTimingThu, fri: clinicTimingFri, sat: clinicTimingSat, sun: clinicTimingSun,
            },
            clinic_facilities: clinicFacilities.split(',').map(s => s.trim()).filter(Boolean),
            clinic_treatments: clinicTreatments.split(',').map(s => s.trim()).filter(Boolean),
            clinic_insurance: clinicInsurance.split(',').map(s => s.trim()).filter(Boolean),
          });
        }
      }
      await api.updateProfile({ bio: body.bio, phone: body.phone, address: body.location });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !doctor) return;
    setSignatureUploading(true);
    try {
      const res = await api.uploadDoctorSignature(doctor._id, file);
      setSignatureUrl(res.signatureUrl);
    } catch (err) { toast.error(err.message); }
    setSignatureUploading(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatar(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground">View and edit your professional profile</p>
      </div>

      {/* Profile Photo */}
      <motion.div whileHover={{ scale: 1.01 }} className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden border-2 border-border/60">
              {avatar ? (
                <img src={avatar} alt={user?.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Camera className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-heading text-xl font-bold text-foreground">{user?.name}</h2>
            <p className="text-primary font-medium">{user?.specialization || doctor?.specialization || 'Doctor'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
              {doctor?.rating && (
                <span className="text-sm text-muted-foreground">★ {doctor.rating} ({doctor.reviews_count || 0} reviews)</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-warning-foreground">Admin Approval Required</p>
            <p className="text-muted-foreground mt-0.5">Profile changes may require admin verification before being publicly visible.</p>
          </div>
        </div>
      </motion.div>

      {/* Profile Details Form */}
      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-6">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Basic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email
              </label>
              <Input value={user?.email || ''} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone
              </label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Address / Location
              </label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Clinic address" />
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Emergency, Refund, Fees & Operations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm"><Switch checked={emergencyOnCall} onCheckedChange={setEmergencyOnCall} /> Acute Care Emergency On-Call</label>
            <div><label className="text-sm font-medium mb-1 block">Refund Guarantee</label><select value={refundGuarantee} onChange={e => setRefundGuarantee(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="auto-refund">Auto-refund 100% + free reschedule</option><option value="manual">Manual review</option></select></div>
            <div><label className="text-sm font-medium mb-1 block">Video Fee ₹</label><Input value={videoFee} onChange={e => setVideoFee(e.target.value)} placeholder="e.g. 500" /></div>
            <div><label className="text-sm font-medium mb-1 block">In-Person Fee ₹</label><Input value={inPersonFee} onChange={e => setInPersonFee(e.target.value)} placeholder="e.g. 700" /></div>
            <div><label className="text-sm font-medium mb-1 block">Emergency Fee ₹</label><Input value={emergencyFee} onChange={e => setEmergencyFee(e.target.value)} placeholder="e.g. 1000" /></div>
            <div><label className="text-sm font-medium mb-1 block">Follow-up Fee</label><Input value={followUpFee} onChange={e => setFollowUpFee(e.target.value)} placeholder="Free / ₹" /></div>
            <div><label className="text-sm font-medium mb-1 block">Follow-up Window</label><select value={followUpWindow} onChange={e => setFollowUpWindow(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option>3 Days</option><option>7 Days</option><option>14 Days</option><option>None</option></select></div>
            <div><label className="text-sm font-medium mb-1 block">Buffer Between Appointments</label><select value={bufferTime} onChange={e => setBufferTime(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"><option>0 min</option><option>5 min</option><option>10 min</option><option>15 min</option></select></div>
            <div><label className="text-sm font-medium mb-1 block">Vacation From</label><Input type="date" value={vacationFrom} onChange={e => setVacationFrom(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Vacation To</label><Input type="date" value={vacationTo} onChange={e => setVacationTo(e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="text-sm font-medium mb-1 block">Vacation Reason</label><Input value={vacationReason} onChange={e => setVacationReason(e.target.value)} placeholder="Out-of-office reason" /></div>
            <div><label className="text-sm font-medium mb-1 block">Council Name</label><Input value={councilName} onChange={e => setCouncilName(e.target.value)} placeholder="e.g. Delhi Medical Council" /></div>
            <div><label className="text-sm font-medium mb-1 block">Council Reg No</label><Input value={councilRegNo} onChange={e => setCouncilRegNo(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Council Year</label><Input value={councilYear} onChange={e => setCouncilYear(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Payout UPI</label><Input value={payoutUpi} onChange={e => setPayoutUpi(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Payout Account</label><Input value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} /></div>
            <div><label className="text-sm font-medium mb-1 block">Payout IFSC</label><Input value={payoutIfsc} onChange={e => setPayoutIfsc(e.target.value)} /></div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" /> Professional Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-muted-foreground" /> Qualifications
              </label>
              <Input value={qualification} onChange={e => setQualification(e.target.value)} placeholder="e.g. MBBS, MD Cardiology" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Experience
              </label>
              <Input value={experience} onChange={e => setExperience(e.target.value)} placeholder="e.g. 12 years" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" /> License Number
              </label>
              <Input value={user?.licenseNumber || ''} disabled className="bg-muted" placeholder="Registered license number" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <Stethoscope className="w-3.5 h-3.5 text-muted-foreground" /> Specialization
              </label>
              <Input value={user?.specialization || doctor?.specialization || ''} disabled className="bg-muted" />
            </div>
          </div>
        </div>

        {doctor?.doctor_type === 'clinic' && (
          <>
            <hr className="border-border/60" />
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Clinic Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Clinic Name</label>
                  <Input value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="e.g. Sharma Skin Clinic" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Clinic Address</label>
                  <Input value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} placeholder="Full clinic address" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Clinic License
                  </label>
                  <Input value={clinicLicense} onChange={e => setClinicLicense(e.target.value)} placeholder="License number" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> Established Year
                  </label>
                  <Input type="number" value={establishedYear} onChange={e => setEstablishedYear(e.target.value)} placeholder="e.g. 2015" />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Clinic Timing
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[['Mon', clinicTimingMon, setClinicTimingMon],['Tue', clinicTimingTue, setClinicTimingTue],['Wed', clinicTimingWed, setClinicTimingWed],['Thu', clinicTimingThu, setClinicTimingThu],['Fri', clinicTimingFri, setClinicTimingFri],['Sat', clinicTimingSat, setClinicTimingSat],['Sun', clinicTimingSun, setClinicTimingSun]].map(([day, val, set]) => (
                    <div key={day}>
                      <label className="text-xs text-muted-foreground">{day}</label>
                      <Input value={val} onChange={e => set(e.target.value)} placeholder="e.g. 10AM-8PM" className="text-xs" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <Pill className="w-3.5 h-3.5 text-muted-foreground" /> Facilities <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                </label>
                <Input value={clinicFacilities} onChange={e => setClinicFacilities(e.target.value)} placeholder="Parking, Wheelchair Access, AC Waiting Area, In-house Pharmacy" />
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" /> Treatments <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                </label>
                <Input value={clinicTreatments} onChange={e => setClinicTreatments(e.target.value)} placeholder="Acne Treatment, Hair Restoration, PRP Therapy, Laser Hair Removal" />
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /> Insurance Accepted <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                </label>
                <Input value={clinicInsurance} onChange={e => setClinicInsurance(e.target.value)} placeholder="ICICI Lombard, Star Health, Aditya Birla" />
              </div>
            </div>
          </>
        )}

        {doctor?.doctor_type !== 'clinic' && doctor?.type !== 'clinic' && (
          <>
            <hr className="border-border/60" />
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Hospital Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Department</label>
                  <Input value={hospitalDept} onChange={e => setHospitalDept(e.target.value)} placeholder="e.g. Cardiology" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> OPD Timing
                  </label>
                  <Input value={hospitalOpdTiming} onChange={e => setHospitalOpdTiming(e.target.value)} placeholder="e.g. 10 AM - 4 PM" />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> Payment Modes <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                </label>
                <Input value={hospitalPaymentModes} onChange={e => setHospitalPaymentModes(e.target.value)} placeholder="Cash, Card, UPI, Insurance" />
              </div>
            </div>
          </>
        )}

        <hr className="border-border/60" />

        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Bio
          </h3>
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Write a short professional bio..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24"></textarea>
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Pen className="w-5 h-5 text-primary" /> Digital Signature
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Upload your signature image to appear on prescriptions, bills, and invoices. Supports PNG and JPG.</p>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-48 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20 overflow-hidden">
              {signatureUrl ? (
                <img src={signatureUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground">No signature</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Upload className="w-4 h-4" />
                  {signatureUploading ? 'Uploading...' : signatureUrl ? 'Replace Signature' : 'Upload from Image'}
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleSignatureUpload} disabled={signatureUploading} />
                </label>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                  <Camera className="w-4 h-4" />
                  {signatureUploading ? 'Capturing...' : 'Capture with Camera'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSignatureUpload} disabled={signatureUploading} />
                </label>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" /> Consultation Fee
          </h3>
          <div className="max-w-xs">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Fee (₹)</label>
            <Input type="number" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} placeholder="e.g. 500" min={0} />
          </div>
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Auto-Confirm My Appointments
          </h3>
          <MyAutoConfirmToggle />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
          {saved && <CheckCircle className="w-4 h-4 text-green-300" />}
        </Button>
      </div>
    </div>
  );
}
