import React, { useEffect, useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AmbulanceSettingsTabProps {
  amb: any;
  setAmb: React.Dispatch<any>;
  user: any;
  setTab: (tab: string) => void;
}

export const AmbulanceSettingsTab: React.FC<AmbulanceSettingsTabProps> = ({
  amb,
  setAmb,
  user,
  setTab,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTab('overview')}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
        </Button>
        <h3 className="font-bold text-base text-foreground">
          Ambulance Protocols & Driver Settings
        </h3>
      </div>

      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-foreground">
          Operations (accept lives outside — global Emergency overlay)
        </h3>
        <p className="text-xs text-muted-foreground">
          Dispatch accept/reject global EmergencyFlowController overlay me hota hai. Yahan standby +
          online rakho; assigned mission Active tab me auto-khulta hai.
        </p>
      </div>

      <AmbSettingsCard
        amb={amb}
        onSaved={(s) =>
          setAmb((p: any) =>
            p
              ? {
                  ...p,
                  settings: s,
                  ambulanceType: s.lifeSupportTier === 'PTV' ? 'PATIENT_TRANSPORT' : s.lifeSupportTier,
                }
              : p
          )
        }
      />

      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Driver Profile & Hospital Association
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-muted-foreground block mb-1">Driver Name / Unit</label>
            <Input
              value={user?.name || amb?.driverName || 'Ambulance Captain'}
              disabled
              className="rounded-xl h-10"
            />
          </div>
          <div>
            <label className="text-muted-foreground block mb-1">Registered Dispatch Phone</label>
            <Input
              value={user?.phone || amb?.driverPhone || '9876543210'}
              disabled
              className="rounded-xl h-10"
            />
          </div>
          <div>
            <label className="text-muted-foreground block mb-1">Hospital Emergency Line</label>
            <Input
              value={amb?.hospitalId?.phone || '0761-2400000'}
              disabled
              className="rounded-xl h-10"
            />
          </div>
          <div>
            <label className="text-muted-foreground block mb-1">Hospital Address</label>
            <Input
              value={amb?.hospitalId?.address || 'Wright Town, Jabalpur'}
              disabled
              className="rounded-xl h-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function AmbSettingsCard({ amb, onSaved }: { amb: any; onSaved: (s: any) => void }) {
  const s = amb?.settings || {};
  const [tier, setTier] = useState(
    s.lifeSupportTier || (amb?.ambulanceType === 'PATIENT_TRANSPORT' ? 'PTV' : 'BLS')
  );
  const [base, setBase] = useState(s.baseDispatchFee ?? '');
  const [perKm, setPerKm] = useState(s.perKmRate ?? '');
  const [oxygenFee, setOxygenFee] = useState(s.oxygenFee ?? '');
  const [radius, setRadius] = useState(String(s.maxRadiusKm ?? 25));
  const [oxygenOk, setOxygenOk] = useState(s.oxygenOk ?? true);
  const [aedOk, setAedOk] = useState(s.aedOk ?? true);
  const [suctionOk, setSuctionOk] = useState(s.suctionOk ?? true);
  const [spineBoardOk, setSpineBoardOk] = useState(s.spineBoardOk ?? true);
  const [emtOnBoard, setEmtOnBoard] = useState(s.emtOnBoard ?? false);
  const [erAutoAlert, setErAutoAlert] = useState(s.erAutoAlert ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const st = amb?.settings || {};
    setTier(st.lifeSupportTier || (amb?.ambulanceType === 'PATIENT_TRANSPORT' ? 'PTV' : 'BLS'));
    setBase(st.baseDispatchFee ?? '');
    setPerKm(st.perKmRate ?? '');
    setOxygenFee(st.oxygenFee ?? '');
    setRadius(String(st.maxRadiusKm ?? 25));
    setOxygenOk(st.oxygenOk ?? true);
    setAedOk(st.aedOk ?? true);
    setSuctionOk(st.suctionOk ?? true);
    setSpineBoardOk(st.spineBoardOk ?? true);
    setEmtOnBoard(st.emtOnBoard ?? false);
    setErAutoAlert(st.erAutoAlert ?? true);
  }, [amb?._id]);

  const save = async () => {
    setSaving(true);
    try {
      const res: any = await api.put('/ambulance/me/settings', {
        settings: {
          lifeSupportTier: tier,
          baseDispatchFee: Number(base) || 0,
          perKmRate: Number(perKm) || 0,
          oxygenFee: Number(oxygenFee) || 0,
          maxRadiusKm: Number(radius) || 0,
          oxygenOk,
          aedOk,
          suctionOk,
          spineBoardOk,
          emtOnBoard,
          erAutoAlert,
        },
      });
      toast.success('Ambulance settings saved');
      onSaved(res.settings || res.ambulance?.settings);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const check = (label: string, v: boolean, set: (b: boolean) => void) => (
    <label className="flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={v}
        onChange={(e) => set(e.target.checked)}
        className="rounded"
      />{' '}
      {label}
    </label>
  );

  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
      <h3 className="font-bold text-base text-foreground">Classification, Tariff & Radius</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block mb-1">Life Support (BLS/ALS/PTV/NICU)</label>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full h-10 rounded-xl border px-3 bg-background"
          >
            {['BLS', 'ALS', 'PTV', 'NICU'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">Base ₹</label>
          <input
            type="number"
            min={0}
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="500"
            className="w-full h-10 rounded-xl border px-3 bg-background"
          />
        </div>
        <div>
          <label className="block mb-1">Per-KM ₹</label>
          <input
            type="number"
            min={0}
            value={perKm}
            onChange={(e) => setPerKm(e.target.value)}
            placeholder="20"
            className="w-full h-10 rounded-xl border px-3 bg-background"
          />
        </div>
        <div>
          <label className="block mb-1">Oxygen support ₹</label>
          <input
            type="number"
            min={0}
            value={oxygenFee}
            onChange={(e) => setOxygenFee(e.target.value)}
            placeholder="300"
            className="w-full h-10 rounded-xl border px-3 bg-background"
          />
        </div>
        <div>
          <label className="block mb-1">Response radius: {radius} km</label>
          <select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="w-full h-10 rounded-xl border px-3 bg-background"
          >
            {['10', '25', '50'].map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {check('Oxygen cylinder >1000 PSI ready', oxygenOk, setOxygenOk)}
        {check('AED ready', aedOk, setAedOk)}
        {check('Suction unit ready', suctionOk, setSuctionOk)}
        {check('Spine board ready', spineBoardOk, setSpineBoardOk)}
        {check('Certified EMT on-board', emtOnBoard, setEmtOnBoard)}
        {check('Hospital ER auto-alert', erAutoAlert, setErAutoAlert)}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save} disabled={saving} className="rounded-xl">
          {saving ? 'Saving...' : 'Save ambulance settings'}
        </Button>
      </div>
    </div>
  );
}
