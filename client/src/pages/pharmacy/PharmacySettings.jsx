import { useState } from 'react';
import { Save, User, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function PharmacySettings() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({ name, phone, address });
      updateUser?.({ ...user, name, phone, address });
      toast.success('Profile updated');
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="font-heading text-xl font-bold text-foreground mb-6">Profile Settings</h1>

      <div className="bg-card rounded-xl border p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
            <User className="w-4 h-4 text-muted-foreground" /> Name
          </label>
          <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
            <Mail className="w-4 h-4 text-muted-foreground" /> Email
          </label>
          <Input value={user?.email || ''} disabled className="bg-muted" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
            <Phone className="w-4 h-4 text-muted-foreground" /> Phone
          </label>
          <Input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block flex items-center gap-1">
            <MapPin className="w-4 h-4 text-muted-foreground" /> Address
          </label>
          <Input placeholder="Your address" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-1" />{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </div>
    </div>
  );
}
