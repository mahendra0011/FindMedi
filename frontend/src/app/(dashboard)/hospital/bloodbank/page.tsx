/**
 * Blood Bank — ported from client/src/pages/BloodBank.jsx (Phase 4).
 * Inventory + requests browser with Add Unit / New Request flows.
 * Cross-match / transfusion / reaction workflows are follow-upside.
 */
'use client';

import { useState } from 'react';
import { Search, Plus, Clock, X, Droplets, CheckCircle, AlertTriangle, FlaskConical, FileText, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useBloodUnits,
  useBloodRequests,
  useBloodBankStats,
  useAddBloodUnit,
  useCreateBloodRequest,
} from '@/features/bloodbank/hooks';
import type { BloodUnit, BloodRequest, BloodBankStats } from '@/features/bloodbank/types';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyStats: BloodBankStats = {
  total: 0,
  available: 0,
  issued: 0,
  pending: 0,
  crossMatching: 0,
  expired: 0,
};

export default function BloodBankPage() {
  const [tab, setTab] = useState<'inventory' | 'requests'>('inventory');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newUnit, setNewUnit] = useState({
    bloodGroup: 'O+',
    donorName: '',
    donationDate: '',
    expiryDate: '',
    volume: 450,
  });
  const [newReq, setNewReq] = useState({
    patientName: '',
    patientId: '',
    bloodGroup: 'O+',
    unitsRequired: 1,
    reason: '',
    priority: 'Routine',
  });

  const { data: statsData, isLoading: statsLoading } = useBloodBankStats();
  const { data: unitsData = [], isLoading: unitsLoading } = useBloodUnits(search);
  const { data: reqsData = [], isLoading: reqsLoading } = useBloodRequests(search);
  const addUnitMut = useAddBloodUnit();
  const createReqMut = useCreateBloodRequest();

  const statsValue: BloodBankStats = {
    ...emptyStats,
    ...((statsData as Partial<BloodBankStats> | undefined) ?? {}),
  };
  const units = unitsData as BloodUnit[];
  const requests = reqsData as BloodRequest[];

  if (statsLoading || unitsLoading || reqsLoading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">Loading blood bank data…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Blood Bank</h1>
        <p className="text-sm text-muted-foreground">
          {statsValue.available} units available · {statsValue.pending} pending · {statsValue.crossMatching} cross-matching
        </p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
        {[
          { l: 'Total Units', v: statsValue.total, c: 'text-foreground', ic: Droplets },
          { l: 'Available', v: statsValue.available, c: 'text-success', ic: CheckCircle },
          { l: 'Cross-Matching', v: statsValue.crossMatching, c: 'text-warning', ic: FlaskConical },
          { l: 'Pending Req', v: statsValue.pending, c: 'text-warning', ic: AlertTriangle },
          { l: 'Issued', v: statsValue.issued, c: 'text-info', ic: FileText },
          { l: 'Expired', v: statsValue.expired, c: 'text-destructive', ic: AlertOctagon },
        ].map((s) => (
          <div key={s.l} className="bg-card rounded-xl border p-3 text-center">
            <s.ic className={`w-4 h-4 mx-auto mb-1 ${s.c}`} />
            <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-[10px] text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 border-b pb-3">
        {(['inventory', 'requests'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {t === 'inventory' ? 'Blood Inventory' : 'Requests & Transfusions'}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Unit
            </Button>
          </div>
          {units.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No blood units found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((u: BloodUnit) => (
                <div
                  key={u._id}
                  className={`bg-card rounded-xl border p-4 ${u.status === 'Available' ? 'border-success/30' : u.status === 'Expired' ? 'border-destructive/30' : 'border-warning/30'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-destructive" />
                      <span className="font-bold text-lg text-foreground">{u.bloodGroup}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'Available' ? 'bg-success/10 text-success' : u.status === 'Expired' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}
                    >
                      {u.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      Unit: {u.unitId} · {u.volume}ml
                    </p>
                    <p>
                      Donor: {u.donorName || 'Unknown'} · Exp:{' '}
                      {u.expiryDate ? new Date(u.expiryDate).toLocaleDateString() : 'N/A'}
                    </p>
                    <p>Components: {u.components?.join(', ')}</p>
                    <div className="flex gap-1 mt-1">
                      {u.hiv === 'Positive' && (
                        <span className="text-[10px] bg-destructive/10 text-destructive px-1 rounded">HIV+</span>
                      )}
                      {u.hbsag === 'Positive' && (
                        <span className="text-[10px] bg-warning/10 text-warning px-1 rounded">HBsAg+</span>
                      )}
                      {u.hcv === 'Positive' && (
                        <span className="text-[10px] bg-warning/10 text-warning px-1 rounded">HCV+</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="flex gap-3 mb-2">
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Request
            </Button>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No blood requests found.</p>
          ) : (
            requests.map((r: BloodRequest) => (
              <div key={r._id} className="bg-card rounded-xl border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Droplets className="w-4 h-4 text-destructive" />
                      <span className="font-semibold text-foreground">{r.requestId}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${r.priority === 'Emergency' ? 'bg-destructive/10 text-destructive' : r.priority === 'Urgent' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}
                      >
                        {r.priority}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{r.status}</span>
                    </div>
                    <p className="text-sm font-medium">
                      {r.patientName} · {r.bloodGroup} · {r.unitsRequired} unit(s)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dr. {r.doctorName} · {r.reason || 'No reason'}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAdd && tab === 'inventory' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Blood Unit</h2>
              <button onClick={() => setShowAdd(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Blood Group</label>
                <select
                  value={newUnit.bloodGroup}
                  onChange={(e) => setNewUnit({ ...newUnit, bloodGroup: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  {bloodGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Volume (ml)</label>
                <Input
                  type="number"
                  value={newUnit.volume}
                  onChange={(e) => setNewUnit({ ...newUnit, volume: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Donor Name</label>
                <Input value={newUnit.donorName} onChange={(e) => setNewUnit({ ...newUnit, donorName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Donation Date</label>
                <Input
                  type="date"
                  value={newUnit.donationDate}
                  onChange={(e) => setNewUnit({ ...newUnit, donationDate: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Expiry Date</label>
                <Input
                  type="date"
                  value={newUnit.expiryDate}
                  onChange={(e) => setNewUnit({ ...newUnit, expiryDate: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full mt-6"
              onClick={() =>
                addUnitMut.mutate(
                  { ...newUnit, components: ['Whole Blood'] },
                  { onSuccess: () => setShowAdd(false) },
                )
              }
              disabled={addUnitMut.isPending || !newUnit.donationDate || !newUnit.expiryDate}
            >
              Add Unit
            </Button>
          </div>
        </div>
      )}

      {showAdd && tab === 'requests' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card rounded-2xl border shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Blood Request</h2>
              <button onClick={() => setShowAdd(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Patient Name</label>
                <Input value={newReq.patientName} onChange={(e) => setNewReq({ ...newReq, patientName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Blood Group</label>
                  <select
                    value={newReq.bloodGroup}
                    onChange={(e) => setNewReq({ ...newReq, bloodGroup: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    {bloodGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Units</label>
                  <Input
                    type="number"
                    value={newReq.unitsRequired}
                    onChange={(e) => setNewReq({ ...newReq, unitsRequired: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <select
                    value={newReq.priority}
                    onChange={(e) => setNewReq({ ...newReq, priority: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                  >
                    {['Routine', 'Urgent', 'Emergency'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Reason</label>
                <Input value={newReq.reason} onChange={(e) => setNewReq({ ...newReq, reason: e.target.value })} />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  createReqMut.mutate({ ...newReq }, { onSuccess: () => setShowAdd(false) })
                }
                disabled={createReqMut.isPending || !newReq.patientName}
              >
                Create Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
