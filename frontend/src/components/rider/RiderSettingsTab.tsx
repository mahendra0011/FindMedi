import React, { useState, useEffect } from 'react';
import { User, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// §8 rider ops master — controlled inputs persisted via PUT /rider/profile {settings}.
export function RiderOpsSettings({ profile, onSaved }: { profile: any; onSaved: (s: any) => void }) {
  const st = profile?.settings || {};
  const [standby, setStandby] = useState(profile?.emergencySupport ?? false);
  const [waitPolicy, setWaitPolicy] = useState(st.waitMinutes != null ? `${st.waitMinutes}|${st.noShowFee ?? 50}` : '5|50');
  const [lateRefund, setLateRefund] = useState(st.lateRefund !== false);
  const [acFit, setAcFit] = useState(st.acAvailable && st.wheelchairFit ? 'both' : st.acAvailable ? 'ac' : 'none');
  const [scope, setScope] = useState(st.transferScope || 'local');
  const [upi, setUpi] = useState(st.payoutUpi || profile?.bankDetails?.upiId || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s2 = profile?.settings || {};
    setStandby(profile?.emergencySupport ?? false);
    if (s2.waitMinutes != null) setWaitPolicy(`${s2.waitMinutes}|${s2.noShowFee ?? 50}`);
    setLateRefund(s2.lateRefund !== false);
    setAcFit(s2.acAvailable && s2.wheelchairFit ? 'both' : s2.acAvailable ? 'ac' : 'none');
    setScope(s2.transferScope || 'local');
    setUpi(s2.payoutUpi || profile?.bankDetails?.upiId || '');
  }, [profile?._id]);

  const save = async () => {
    const [waitMinutes, noShowFee] = waitPolicy.split('|').map(Number);
    setSaving(true);
    try {
      const res: any = await api.updateRiderProfile({
        emergencySupport: standby,
        bankDetails: { upiId: upi },
        settings: {
          waitMinutes: waitMinutes || 0,
          noShowFee: noShowFee || 0,
          lateRefund,
          acAvailable: acFit === 'both' || acFit === 'ac',
          wheelchairFit: acFit === 'both',
          transferScope: scope,
          payoutUpi: upi,
        },
      });
      toast.success('Rider settings saved');
      onSaved(res.rider?.settings || res.settings);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border p-3">
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={standby} onChange={(e) => setStandby(e.target.checked)} className="rounded" />
        Emergency Medical Standby (1.25x)
      </label>
      <div>
        <label className="text-xs font-semibold">Wait/No-show Policy</label>
        <select value={waitPolicy} onChange={(e) => setWaitPolicy(e.target.value)} className="w-full h-9 rounded-xl border text-xs bg-background">
          <option value="5|50">5 min wait; ₹50 no-show</option>
          <option value="10|0">10 min wait; no fee</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" checked={lateRefund} onChange={(e) => setLateRefund(e.target.checked)} className="rounded" />
        100% refund if driver &gt;10m late
      </label>
      <div>
        <label className="text-xs font-semibold">AC / Wheelchair Trunk</label>
        <select value={acFit} onChange={(e) => setAcFit(e.target.value)} className="w-full h-9 rounded-xl border text-xs bg-background">
          <option value="both">AC + wheelchair fit</option>
          <option value="ac">AC only</option>
          <option value="none">Non-AC</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold">Transfer Radius</label>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full h-9 rounded-xl border text-xs bg-background">
          <option value="local">Local 15 km</option>
          <option value="regional">Regional 50 km</option>
          <option value="intercity">Inter-city</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold">Settlement UPI / Account</label>
        <input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="UPI / Account + IFSC" className="w-full h-9 rounded-xl border px-3 text-xs bg-background" />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button size="sm" onClick={save} disabled={saving} className="rounded-xl text-xs">
          {saving ? 'Saving...' : 'Save ride preferences'}
        </Button>
      </div>
    </div>
  );
}

export interface RiderSettingsTabProps {
  user: any;
  profile: any;
  setProfile: (fn: any) => void;
  navigate: (path: string) => void;
}

export const RiderSettingsTab: React.FC<RiderSettingsTabProps> = ({
  user,
  profile,
  setProfile,
  navigate,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/rider/dashboard')}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Button>
        <h3 className="font-bold text-base text-foreground">Rider Settings & Preferences</h3>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          Driver Profile Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-muted-foreground block mb-1">Full Name</label>
            <Input value={user?.name || ''} disabled className="rounded-xl h-10" />
          </div>
          <div>
            <label className="text-muted-foreground block mb-1">Mobile Number</label>
            <Input value={user?.phone || profile?.phone || ''} disabled className="rounded-xl h-10" />
          </div>
          <div>
            <label className="text-muted-foreground block mb-1">Registered Email</label>
            <Input value={user?.email || ''} disabled className="rounded-xl h-10" />
          </div>
          <div>
            <label className="text-muted-foreground block mb-1">Operating City</label>
            <Input value={profile?.city || user?.city || 'Jabalpur'} disabled className="rounded-xl h-10" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          Ride Preferences & Safety
        </h3>
        <RiderOpsSettings profile={profile} onSaved={(s) => setProfile((p: any) => (p ? { ...p, settings: s } : p))} />
        <div className="divide-y divide-border/60 text-xs">
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Auto-Accept Ride Inquiries</p>
              <p className="text-muted-foreground">Automatically accept high-priority nearby emergency bookings.</p>
            </div>
            <Switch defaultChecked={false} />
          </div>
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Sound & Caller Ringtone Alerts</p>
              <p className="text-muted-foreground">Play caller ringtone when full-screen ride request arrives.</p>
            </div>
            <Switch defaultChecked={true} />
          </div>
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">High-Accuracy GPS Heartbeat</p>
              <p className="text-muted-foreground">Broadcast live vehicle telemetry to passengers while in-transit.</p>
            </div>
            <Switch defaultChecked={true} />
          </div>
        </div>
      </div>
    </div>
  );
};
