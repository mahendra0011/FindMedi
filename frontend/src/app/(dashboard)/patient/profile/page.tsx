/**
 * Profile Settings — ported from client/src/pages/patient/PatientProfile.jsx (Phase 4).
 * Personal info + medical history editing.
 */
'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/api';
import type { User as UserModel } from '@/types/models/user';

const formatDate = (d?: string) => {
  if (!d) return '';
  try {
    return d.includes('T') ? d.split('T')[0] ?? '' : String(d).slice(0, 10);
  } catch {
    return '';
  }
};

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  allergies: string;
}

const fields: { key: keyof ProfileForm; label: string; type?: string }[] = [
  { key: 'name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
  { key: 'bloodGroup', label: 'Blood Group' },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const u = user as unknown as (Partial<UserModel> & { uhid?: string }) | null;
  const [form, setForm] = useState<ProfileForm>({
    name: u?.name || '',
    email: u?.email || '',
    phone: u?.phone || '',
    address: u?.address || '',
    gender: u?.gender || '',
    dateOfBirth: formatDate(u?.dateOfBirth),
    bloodGroup: u?.bloodGroup || '',
    allergies: (u?.allergies ?? []).map((a) => (typeof a === 'string' ? a : a.allergen)).join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await auth.updateProfile({
        ...form,
        allergies: form.allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map((allergen) => ({ allergen })),
      } as unknown as Partial<UserModel>);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and medical history</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border p-6 space-y-5 max-w-2xl"
      >
        <div className="flex items-center gap-4 pb-5 border-b">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-muted-foreground">
              {user?.email} · {user?.phone}
            </p>
            {u?.uhid && <p className="text-xs text-primary font-mono">UHID: {u.uhid}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium mb-1 block">{f.label}</label>
              <Input type={f.type || 'text'} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Allergies (comma separated)</label>
          <Input
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            placeholder="e.g. Penicillin, Peanuts, Sulfa"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This helps doctors and pharmacists avoid prescribing medicines you&apos;re allergic to.
          </p>
        </div>

        <Button className="w-full mt-6" onClick={() => void handleSave()} disabled={saving}>
          <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </motion.div>
    </div>
  );
}
