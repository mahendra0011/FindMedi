/**
 * My Profile — ported from client/src/pages/doctor/DoctorProfile.jsx (Phase 4).
 * Professional details, clinic/hospital sections, signature, auto-confirm settings.
 */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  Award,
  Clock,
  Hash,
  Save,
  Upload,
  AlertCircle,
  CheckCircle,
  Camera,
  Pen,
  Building2,
  CalendarDays,
  Pill,
  Shield,
  HelpCircle,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  useMyDoctor,
  useUpdateDoctor,
  useUploadDoctorSignature,
  useAutoConfirmSettings,
  updateDoctorClinicProfile,
  updateUserProfile,
} from '@/features/doctor';
import type { ClinicProfileData } from '@/features/doctor';

function MyAutoConfirmToggle({ doctorId }: { doctorId?: string }) {
  const { autoConfirmQuery, slotQuery, toggleAutoConfirm, saveSlotCapacity } = useAutoConfirmSettings(doctorId);
  const [value, setValue] = useState(true);
  const [maxSlot, setMaxSlot] = useState(1);

   
  useEffect(() => {
    const ac = autoConfirmQuery.data as { autoConfirmAppointment?: boolean } | undefined;
     
    if (ac) setValue(ac.autoConfirmAppointment !== false);
  }, [autoConfirmQuery.data]);

  useEffect(() => {
     
    if (slotQuery.data?.maxBookingsPerSlot) setMaxSlot(slotQuery.data.maxBookingsPerSlot);
  }, [slotQuery.data]);

  if (autoConfirmQuery.isLoading || slotQuery.isLoading) return null;

  const toggle = () => {
    const next = !value;
    setValue(next);
    toggleAutoConfirm.mutate(next, {
      onSuccess: () => toast.success('Setting updated'),
      onError: () => {
        toast.error('Failed to update');
        setValue(!next);
      },
    });
  };

  const save = (n: number) => {
    setMaxSlot(n);
    saveSlotCapacity.mutate(n, {
      onSuccess: () => toast.success('Slot capacity updated'),
      onError: () => toast.error('Failed to update slot capacity'),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-sm text-foreground">Auto-Confirm My Appointments</p>
          <p className="text-xs text-muted-foreground">ON par payment ke baad turant confirm; OFF par manually confirm karna hoga.</p>
        </div>
        <Switch checked={value} disabled={toggleAutoConfirm.isPending} onCheckedChange={toggle} />
      </div>
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
        <div>
          <p className="font-medium text-sm text-foreground">Patients Per Time Slot</p>
          <p className="text-xs text-muted-foreground">Apne consultation time ke hisaab se — ek slot me kitne patients book ho sakte hain.</p>
        </div>
        <Input
          type="number"
          min={1}
          max={20}
          className="w-20"
          value={maxSlot}
          onChange={(e) => save(Number(e.target.value) || 1)}
        />
      </div>
    </div>
  );
}

export function DoctorProfileHub() {
  const { user } = useAuth();
  const { data: doctor, isLoading } = useMyDoctor(user?.email ?? '', user?.name ?? '');
  const updateMut = useUpdateDoctor();
  const signatureMut = useUploadDoctorSignature();

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
    if (!doctor) return;
     
    setBio(doctor.bio || '');
    setQualification(doctor.qualifications || '');
    setExperience(doctor.experience || '');
    setPhone(doctor.phone || '');
    setAddress(doctor.location || '');
    setConsultationFee(doctor.consultation_fees ? String(doctor.consultation_fees) : '');
    setAvatar(doctor.profile_photo || '');
    setSignatureUrl(doctor.signatureUrl || '');
    const cp = (doctor as unknown as { clinicProfile?: ClinicProfileData }).clinicProfile ?? {};
    setClinicName(cp.clinic_name || '');
    setClinicAddress(cp.clinic_address || '');
    setClinicLicense(cp.clinic_license || '');
    setEstablishedYear(cp.established_year ? String(cp.established_year) : '');
    const t = cp.clinic_timing ?? {};
    setClinicTimingMon(t.mon || '');
    setClinicTimingTue(t.tue || '');
    setClinicTimingWed(t.wed || '');
    setClinicTimingThu(t.thu || '');
    setClinicTimingFri(t.fri || '');
    setClinicTimingSat(t.sat || '');
    setClinicTimingSun(t.sun || '');
    setClinicFacilities((cp.clinic_facilities ?? []).join(', '));
    setClinicTreatments((cp.clinic_treatments ?? []).join(', '));
    setClinicInsurance((cp.clinic_insurance ?? []).join(', '));
  }, [doctor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        bio,
        qualifications: qualification,
        experience,
        phone,
        location: address,
        consultation_fees: consultationFee ? Number(consultationFee) : 0,
        profile_photo: avatar,
      };
      if (doctor) {
        await new Promise((resolve, reject) => {
          updateMut.mutate(
            { id: doctor._id, body },
            { onSuccess: (d) => resolve(d), onError: (e) => reject(e) },
          );
        });
        if (doctor.doctor_type === 'clinic') {
          await updateDoctorClinicProfile(doctor._id, {
            clinic_name: clinicName,
            clinic_address: clinicAddress,
            clinic_license: clinicLicense,
            established_year: establishedYear ? parseInt(establishedYear, 10) : undefined,
            clinic_timing: {
              mon: clinicTimingMon,
              tue: clinicTimingTue,
              wed: clinicTimingWed,
              thu: clinicTimingThu,
              fri: clinicTimingFri,
              sat: clinicTimingSat,
              sun: clinicTimingSun,
            },
            clinic_facilities: clinicFacilities.split(',').map((s) => s.trim()).filter(Boolean),
            clinic_treatments: clinicTreatments.split(',').map((s) => s.trim()).filter(Boolean),
            clinic_insurance: clinicInsurance.split(',').map((s) => s.trim()).filter(Boolean),
          });
        }
      }
      await updateUserProfile({ phone, address });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile');
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const timingFields: [string, string, React.Dispatch<React.SetStateAction<string>>][] = [
    ['Mon', clinicTimingMon, setClinicTimingMon],
    ['Tue', clinicTimingTue, setClinicTimingTue],
    ['Wed', clinicTimingWed, setClinicTimingWed],
    ['Thu', clinicTimingThu, setClinicTimingThu],
    ['Fri', clinicTimingFri, setClinicTimingFri],
    ['Sat', clinicTimingSat, setClinicTimingSat],
    ['Sun', clinicTimingSun, setClinicTimingSun],
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground">View and edit your professional profile</p>
      </div>

      <motion.div whileHover={{ scale: 1.01 }} className="bg-card rounded-2xl border border-border/60 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center overflow-hidden border-2 border-border/60">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={user?.name ?? 'Doctor'} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Camera className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (typeof ev.target?.result === 'string') setAvatar(ev.target.result);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
            <p className="text-primary font-medium">{user?.specialization || doctor?.specialization || 'Doctor'}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="capitalize">
                {user?.role}
              </Badge>
              {doctor?.rating ? (
                <span className="text-sm text-muted-foreground">
                  ★ {doctor.rating} ({doctor.reviews_count || 0} reviews)
                </span>
              ) : null}
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

      <div className="bg-card rounded-2xl border border-border/60 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
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
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Address / Location
              </label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Clinic address" />
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" /> Professional Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-muted-foreground" /> Qualifications
              </label>
              <Input value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. MBBS, MD Cardiology" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Experience
              </label>
              <Input value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 12 years" />
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
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Clinic Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Clinic Name</label>
                  <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="e.g. Sharma Skin Clinic" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Clinic Address</label>
                  <Input value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} placeholder="Full clinic address" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" /> Clinic License
                  </label>
                  <Input value={clinicLicense} onChange={(e) => setClinicLicense(e.target.value)} placeholder="License number" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> Established Year
                  </label>
                  <Input type="number" value={establishedYear} onChange={(e) => setEstablishedYear(e.target.value)} placeholder="e.g. 2015" />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Clinic Timing
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {timingFields.map(([day, val, set]) => (
                    <div key={day}>
                      <label className="text-xs text-muted-foreground">{day}</label>
                      <Input value={val} onChange={(e) => set(e.target.value)} placeholder="e.g. 10AM-8PM" className="text-xs" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <Pill className="w-3.5 h-3.5 text-muted-foreground" /> Facilities <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                </label>
                <Input
                  value={clinicFacilities}
                  onChange={(e) => setClinicFacilities(e.target.value)}
                  placeholder="Parking, Wheelchair Access, AC Waiting Area, In-house Pharmacy"
                />
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" /> Treatments <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                </label>
                <Input
                  value={clinicTreatments}
                  onChange={(e) => setClinicTreatments(e.target.value)}
                  placeholder="Acne Treatment, Hair Restoration, PRP Therapy, Laser Hair Removal"
                />
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /> Insurance Accepted <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                </label>
                <Input
                  value={clinicInsurance}
                  onChange={(e) => setClinicInsurance(e.target.value)}
                  placeholder="ICICI Lombard, Star Health, Aditya Birla"
                />
              </div>
            </div>
          </>
        )}

        {doctor && doctor.doctor_type !== 'clinic' && (
          <>
            <hr className="border-border/60" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Hospital Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Department</label>
                  <Input value={hospitalDept} onChange={(e) => setHospitalDept(e.target.value)} placeholder="e.g. Cardiology" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" /> OPD Timing
                  </label>
                  <Input value={hospitalOpdTiming} onChange={(e) => setHospitalOpdTiming(e.target.value)} placeholder="e.g. 10 AM - 4 PM" />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> Payment Modes <span className="text-xs text-muted-foreground font-normal">(comma separated)</span>
                </label>
                <Input
                  value={hospitalPaymentModes}
                  onChange={(e) => setHospitalPaymentModes(e.target.value)}
                  placeholder="Cash, Card, UPI, Insurance"
                />
              </div>
            </div>
          </>
        )}

        <hr className="border-border/60" />

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Bio
          </h3>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short professional bio..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24"
          />
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Pen className="w-5 h-5 text-primary" /> Digital Signature
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your signature image to appear on prescriptions, bills, and invoices. Supports PNG and JPG.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-48 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20 overflow-hidden">
              {signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
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
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    disabled={signatureUploading || !doctor}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !doctor) return;
                      setSignatureUploading(true);
                      signatureMut.mutate(
                        { id: doctor._id, file },
                        {
                          onSuccess: (res) => setSignatureUrl(res.url),
                          onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed'),
                          onSettled: () => setSignatureUploading(false),
                        },
                      );
                    }}
                  />
                </label>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors">
                  <Camera className="w-4 h-4" />
                  {signatureUploading ? 'Capturing...' : 'Capture with Camera'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={signatureUploading || !doctor}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !doctor) return;
                      setSignatureUploading(true);
                      signatureMut.mutate(
                        { id: doctor._id, file },
                        {
                          onSuccess: (res) => setSignatureUrl(res.url),
                          onError: (err) => toast.error(err instanceof Error ? err.message : 'Upload failed'),
                          onSettled: () => setSignatureUploading(false),
                        },
                      );
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" /> Consultation Fee
          </h3>
          <div className="max-w-xs">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Fee (₹)</label>
            <Input type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} placeholder="e.g. 500" min={0} />
          </div>
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Auto-Confirm My Appointments
          </h3>
          <MyAutoConfirmToggle doctorId={doctor?._id} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving} className="gap-2 px-8">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
          {saved && <CheckCircle className="w-4 h-4 text-green-300" />}
        </Button>
      </div>
    </div>
  );
}

export default DoctorProfileHub;
