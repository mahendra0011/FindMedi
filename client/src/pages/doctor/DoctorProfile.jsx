import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Stethoscope, Award, Clock, Hash, Save, Upload, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function DoctorProfile() {
  const { user, updateUser } = useAuth();
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const doctors = await api.getDoctors();
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
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [user?.email, user?.name]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = { bio, qualifications: qualification, experience, phone, location: address, consultation_fees: consultationFee, avatar };
      if (doctor) {
        await api.updateDoctor(doctor._id, body);
      }
      await api.updateProfile({ bio: body.bio, phone: body.phone, address: body.location });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
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

        <hr className="border-border/60" />

        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Bio
          </h3>
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Write a short professional bio..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-24" />
        </div>

        <hr className="border-border/60" />

        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" /> Consultation Fee
          </h3>
          <div className="max-w-xs">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Fee (Rs)</label>
            <Input type="number" value={consultationFee} onChange={e => setConsultationFee(e.target.value)} placeholder="e.g. 500" min={0} />
          </div>
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
