import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, User, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const formatDate = (d) => {
  if (!d) return '';
  try { return d.includes('T') ? d.split('T')[0] : String(d).slice(0, 10); } catch { return ''; }
};

export default function PatientProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '',
    address: user?.address || '', gender: user?.gender || '',
    dateOfBirth: formatDate(user?.dateOfBirth), bloodGroup: user?.bloodGroup || '',
    allergies: user?.allergies?.map(a => a.allergen).join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Only JPEG, PNG, WEBP, and GIF images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const data: any = await api.uploadAvatar(file);
      const avatar = data?.user?.avatar || data?.avatar || '';
      if (data?.user) updateUser(data.user);
      else updateUser({ avatar });
      toast.success('Profile photo updated successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile(form);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and medical history</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border p-6 space-y-5 max-w-2xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarSelect}
        />
        <div className="flex items-center gap-4 pb-5 border-b">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-16 h-16 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-2xl font-bold text-primary border-2 border-primary/20">
              {uploadingAvatar ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : user?.avatar ? (
                <img src={user.avatar} alt={user?.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-card border-2 border-background rounded-full flex items-center justify-center shadow-sm">
              <Camera className="w-3.5 h-3.5 text-foreground" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email} · {user?.phone}</p>
            {user?.uhid && <p className="text-xs text-primary font-mono">UHID: {user.uhid}</p>}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="text-xs text-primary hover:underline font-medium mt-1 block"
            >
              {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'address', label: 'Address' },
            { key: 'gender', label: 'Gender' },
            { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
            { key: 'bloodGroup', label: 'Blood Group' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-sm font-medium mb-1 block">{f.label}</label>
              <Input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Allergies (comma separated)</label>
          <Input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Peanuts, Sulfa" />
          <p className="text-xs text-muted-foreground mt-1">This helps doctors and pharmacists avoid prescribing medicines you're allergic to.</p>
        </div>

        <Button className="w-full mt-6" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </motion.div>
    </div>
  );
}
