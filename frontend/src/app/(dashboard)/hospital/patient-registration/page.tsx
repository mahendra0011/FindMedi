/**
 * Patient Registration — ported from client/src/pages/PatientRegistration.jsx (Phase 4).
 * Patient search, registration with UHID, printable confirmation.
 */
'use client';

import { useState } from 'react';
import { Search, User, Plus, X, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePatientSearch, useRegStats, useCreatePatient } from '@/features/opd/hooks';
import type { OPDPatient, RegStats } from '@/features/opd/types';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyStats: RegStats = { total: 0, today: 0, newThisMonth: 0 };

export default function PatientRegistrationPage() {
  const [search, setSearch] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    dateOfBirth: '',
    address: '',
    bloodGroup: 'A+',
    emergencyContact: '',
    emergencyPhone: '',
  });
  const [registeredPatient, setRegisteredPatient] = useState<OPDPatient | null>(null);

  const { data: searchData } = usePatientSearch(search);
  const { data: statsData } = useRegStats();
  const registerMut = useCreatePatient();

  const searchResults: OPDPatient[] = searchData ?? [];
  const stats: RegStats = { ...emptyStats, ...((statsData as Partial<RegStats> | undefined) ?? {}) };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Patient Registration</h1>
        <p className="text-sm text-muted-foreground">
          {stats.total} total · {stats.today} today
        </p>
      </div>

      {registeredPatient && (
        <div className="bg-success/10 border border-success/30 rounded-2xl p-6 mb-6 text-center animate-in slide-in-from-top">
          <p className="text-lg font-bold text-success mb-1">✅ Patient Registered Successfully</p>
          <p className="text-2xl font-bold text-foreground">{registeredPatient.name}</p>
          <p className="text-sm text-muted-foreground">
            UHID: <span className="font-mono font-bold">{registeredPatient.uhid}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Phone: {registeredPatient.phone} · Blood Group: {registeredPatient.bloodGroup}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { l: 'Total Patients', v: stats.total, c: 'text-foreground' },
          { l: 'Registered Today', v: stats.today, c: 'text-primary' },
          { l: 'New This Month', v: stats.newThisMonth, c: 'text-success' },
        ].map((s) => (
          <div key={s.l} className="bg-card rounded-xl border p-4 text-center">
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by UHID, Name, Phone..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowRegister(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Registration
        </Button>
      </div>

      <div className="space-y-3">
        {searchResults.map((p) => (
          <div key={p._id} className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">{p.uhid}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>
                    <Phone className="w-3 h-3 inline mr-1" />
                    {p.phone}
                  </span>
                  <span>
                    {p.gender} · {p.bloodGroup}
                  </span>
                  {p.dateOfBirth && (
                    <span>
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(p.dateOfBirth).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline">
                Select
              </Button>
            </div>
          </div>
        ))}
        {search.length > 2 && searchResults.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">No patients found. Register a new patient.</div>
        )}
      </div>

      {showRegister && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRegister(false)}>
          <div
            className="bg-card rounded-2xl border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">New Patient Registration</h2>
              <button onClick={() => setShowRegister(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Full Name *</label>
                <Input
                  placeholder="Full name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone *</label>
                <Input
                  placeholder="Phone number"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Gender</label>
                <select
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date of Birth</label>
                <Input
                  type="date"
                  value={newPatient.dateOfBirth}
                  onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Address</label>
                <Input
                  placeholder="Patient address"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Blood Group</label>
                <select
                  value={newPatient.bloodGroup}
                  onChange={(e) => setNewPatient({ ...newPatient, bloodGroup: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                >
                  {bloodGroups.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Emergency Contact</label>
                <Input
                  value={newPatient.emergencyContact}
                  onChange={(e) => setNewPatient({ ...newPatient, emergencyContact: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Emergency Phone</label>
                <Input
                  placeholder="Emergency phone"
                  value={newPatient.emergencyPhone}
                  onChange={(e) => setNewPatient({ ...newPatient, emergencyPhone: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full mt-6"
              onClick={() =>
                registerMut.mutate(
                  { ...newPatient, age: '', uhid: '' },
                  {
                    onSuccess: (d) => {
                      setShowRegister(false);
                      setRegisteredPatient(d as OPDPatient);
                      setTimeout(() => setRegisteredPatient(null), 8000);
                    },
                  },
                )
              }
              disabled={registerMut.isPending || !newPatient.name || !newPatient.phone}
            >
              Register Patient
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
