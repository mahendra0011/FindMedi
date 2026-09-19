import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ambulance,
  Plus,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Phone,
  User,
  Power,
  Info,
  Car,
  Activity,
  Filter,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { EmergencyToggleConfirm } from '@/components/emergency/EmergencyToggleConfirm';

interface StaffMember {
  _id: string;
  name: string;
  role: string;
  contactNumber?: string;
}

interface AmbulanceItem {
  _id: string;
  registrationNumber: string;
  vehicleModel?: string;
  ambulanceType: 'BLS' | 'ALS' | 'PATIENT_TRANSPORT' | 'MORTUARY';
  equipmentLevel?: string;
  currentDriverId?: {
    _id: string;
    name: string;
    contactNumber?: string;
  } | null;
  currentDriverPhone?: string;
  driverName?: string;
  driverPhone?: string;
  loginEmail?: string;
  loginStatus?: 'none' | 'invited' | 'active';
  lastPingAt?: string;
  isOnline: boolean;
  isOnDuty: boolean;
  emergencySupport: boolean;
  currentLocation?: {
    coordinates: [number, number];
    updatedAt?: string;
  };
  createdAt?: string;
}

export default function ManageAmbulancesPage() {
  const [ambulances, setAmbulances] = useState<AmbulanceItem[]>([]);
  const [drivers, setDrivers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterEmergency, setMasterEmergency] = useState(false);
  const [masterToggling, setMasterToggling] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<AmbulanceItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Confirm State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form Fields (Doc 02: driver name/phone + login email, no Staff dropdown)
  const [formData, setFormData] = useState({
    registrationNumber: '',
    vehicleModel: '',
    ambulanceType: 'BLS' as 'BLS' | 'ALS' | 'PATIENT_TRANSPORT' | 'MORTUARY',
    equipmentLevel: 'Oxygen, Stretcher, First Aid Kit',
    driverName: '',
    driverPhone: '',
    loginEmail: '',
    currentDriverPhone: '',
  });

  // Confirm dialogs (Doc 01 §9.3)
  const [masterConfirm, setMasterConfirm] = useState<{ open: boolean; value: boolean }>({ open: false, value: false });
  const [perAmbConfirm, setPerAmbConfirm] = useState<{ open: boolean; amb: AmbulanceItem | null; value: boolean }>({ open: false, amb: null, value: false });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hospRes, ambRes, staffRes] = await Promise.allSettled([
        api.get('/hospitals/admin/mine'),
        api.get('/hospitals/ambulances'),
        api.get('/staff'),
      ]);

      if (hospRes.status === 'fulfilled' && hospRes.value) {
        setMasterEmergency(Boolean(hospRes.value.emergencySupport));
      }

      if (ambRes.status === 'fulfilled' && ambRes.value) {
        setAmbulances(ambRes.value.ambulances || []);
      }

      if (staffRes.status === 'fulfilled' && staffRes.value) {
        const staffList: StaffMember[] = staffRes.value.staff || [];
        // Filter or rank drivers first
        const driverList = staffList.filter(
          s => s.role === 'Driver' || s.role === 'Ambulance Driver' || s.role === 'Technician' || s.role === 'Helper'
        );
        setDrivers(driverList.length > 0 ? driverList : staffList);
      }
    } catch (err: any) {
      console.error('Failed to load fleet data:', err);
      toast.error('Failed to load ambulance fleet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Master SOS Toggle (confirm first — Doc 01 §9.3)
  const handleMasterToggle = async (checked: boolean) => {
    setMasterConfirm({ open: true, value: checked });
  };
  const confirmMasterToggle = async () => {
    const checked = masterConfirm.value;
    setMasterConfirm({ open: false, value: false });
    const onlineCount = ambulances.filter(a => a.isOnline).length;
    if (checked && onlineCount === 0) {
      toast.warning('Warning: No ambulances are currently marked Online. SOS dispatch will escalate to marketplace vehicles until an ambulance is online.');
    }
    try {
      setMasterToggling(true);
      await api.put('/hospitals/emergency-toggle', { emergencySupport: checked });
      setMasterEmergency(checked);
      toast.success(checked ? 'Hospital Emergency SOS acceptance is now ACTIVE.' : 'Hospital Emergency SOS acceptance PAUSED.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to toggle master Emergency SOS.');
    } finally {
      setMasterToggling(false);
    }
  };

  // Toggle individual ambulance online
  const handleToggleOnline = async (amb: AmbulanceItem) => {
    const newStatus = !amb.isOnline;
    try {
      await api.put(`/hospitals/ambulances/${amb._id}`, { isOnline: newStatus });
      setAmbulances(prev =>
        prev.map(a => (a._id === amb._id ? { ...a, isOnline: newStatus } : a))
      );
      toast.success(`${amb.registrationNumber} is now ${newStatus ? 'Online & Ready' : 'Offline'}`);
    } catch (err: any) {
      toast.error('Failed to update ambulance status.');
    }
  };

  // Toggle individual ambulance emergency support (confirm — Doc 01 §9.3)
  const handleToggleEmergencySupport = async (amb: AmbulanceItem) => {
    setPerAmbConfirm({ open: true, amb, value: !amb.emergencySupport });
  };
  const confirmPerAmbToggle = async () => {
    const { amb, value } = perAmbConfirm;
    setPerAmbConfirm({ open: false, amb: null, value: false });
    if (!amb) return;
    try {
      await api.put(`/hospitals/ambulances/${amb._id}`, { emergencySupport: value });
      setAmbulances(prev =>
        prev.map(a => (a._id === amb._id ? { ...a, emergencySupport: value } : a))
      );
      toast.success(`${amb.registrationNumber} SOS support set to ${value ? 'Enabled' : 'Disabled'}`);
    } catch (err: any) {
      toast.error('Failed to update emergency support.');
    }
  };

  // Open Create/Edit Modal
  const handleOpenModal = (amb?: AmbulanceItem) => {
    if (amb) {
      setEditingAmbulance(amb);
      setFormData({
        registrationNumber: amb.registrationNumber || '',
        vehicleModel: amb.vehicleModel || '',
        ambulanceType: amb.ambulanceType || 'BLS',
        equipmentLevel: amb.equipmentLevel || '',
        driverName: (amb as any).driverName || amb.currentDriverId?.name || '',
        driverPhone: (amb as any).driverPhone || amb.currentDriverPhone || '',
        loginEmail: (amb as any).loginEmail || '',
        currentDriverPhone: amb.currentDriverPhone || (amb as any).driverPhone || '',
      });
    } else {
      setEditingAmbulance(null);
      setFormData({
        registrationNumber: '',
        vehicleModel: '',
        ambulanceType: 'BLS',
        equipmentLevel: 'Oxygen, Stretcher, First Aid Kit',
        driverName: '',
        driverPhone: '',
        loginEmail: '',
        currentDriverPhone: '',
      });
    }
    setIsModalOpen(true);
  };

  // Save (Create or Update) Ambulance
  const handleSaveAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber.trim()) {
      toast.error('Vehicle registration number is required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        registrationNumber: formData.registrationNumber.trim().toUpperCase(),
        vehicleModel: formData.vehicleModel.trim(),
        ambulanceType: formData.ambulanceType,
        equipmentLevel: formData.equipmentLevel.trim(),
        driverName: formData.driverName.trim(),
        driverPhone: formData.driverPhone.trim(),
        currentDriverPhone: (formData.driverPhone || formData.currentDriverPhone).trim(),
        ...(formData.loginEmail.trim() ? { loginEmail: formData.loginEmail.trim().toLowerCase() } : {}),
      };

      if (editingAmbulance) {
        const res = await api.put(`/hospitals/ambulances/${editingAmbulance._id}`, payload);
        toast.success('Ambulance updated successfully.');
      } else {
        const res = await api.post('/hospitals/ambulances', payload);
        toast.success('New ambulance registered into fleet.');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save ambulance.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Ambulance
  const handleDeleteAmbulance = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleting(true);
      await api.del(`/hospitals/ambulances/${deleteConfirmId}`);
      toast.success('Ambulance removed from fleet.');
      setDeleteConfirmId(null);
      setAmbulances(prev => prev.filter(a => a._id !== deleteConfirmId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete ambulance.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredAmbulances = ambulances.filter(amb => {
    const matchesSearch =
      amb.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (amb.vehicleModel && amb.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (amb.currentDriverId?.name && amb.currentDriverId.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || amb.ambulanceType === typeFilter;
    return matchesSearch && matchesType;
  });

  const onlineCount = ambulances.filter(a => a.isOnline).length;
  const onDutyCount = ambulances.filter(a => a.isOnDuty).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Master SOS Switch */}
      <div className="rounded-3xl border border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10">
                <Ambulance className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Hospital Ambulance Fleet
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Manage emergency vehicles, on-duty drivers, and 24/7 Emergency SOS dispatch participation
                </p>
              </div>
            </div>
          </div>

          {/* Master SOS Toggle Card */}
          <div className="bg-slate-950/80 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-6 min-w-[280px]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${masterEmergency ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-sm font-extrabold text-white">
                  Accept Emergency SOS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {masterEmergency
                  ? 'Hospital is actively receiving emergency SOS calls'
                  : 'Hospital emergency SOS dispatch is currently paused'}
              </p>
            </div>

            <Switch
              checked={masterEmergency}
              disabled={masterToggling}
              onCheckedChange={handleMasterToggle}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
        </div>

        {/* Warning if Master is ON but 0 ambulances online */}
        {masterEmergency && onlineCount === 0 && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Attention:</strong> No ambulances in your fleet are currently marked <strong>Online</strong>. SOS dispatches cannot be routed to your drivers until at least one ambulance is toggled Online.
            </span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-1">
          <p className="text-xs font-semibold text-slate-400">Total Fleet</p>
          <p className="text-2xl sm:text-3xl font-black text-white">{ambulances.length}</p>
          <p className="text-[11px] text-slate-500">Registered ambulances</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-1">
          <p className="text-xs font-semibold text-emerald-400">Online & Ready</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">{onlineCount}</p>
          <p className="text-[11px] text-emerald-500/80">Ready for immediate dispatch</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 space-y-1">
          <p className="text-xs font-semibold text-amber-400">Currently Responding</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-400">{onDutyCount}</p>
          <p className="text-[11px] text-amber-500/80">On emergency duty</p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-4 space-y-1">
          <p className="text-xs font-semibold text-sky-400">Assigned Drivers</p>
          <p className="text-2xl sm:text-3xl font-black text-sky-400">
            {ambulances.filter(a => Boolean(a.currentDriverId)).length}
          </p>
          <p className="text-[11px] text-sky-500/80">Staff drivers linked</p>
        </div>
      </div>

      {/* Action Bar: Search, Filter, Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by reg number, model, or driver..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900/80 border-slate-700/80 rounded-xl text-xs h-10 text-white placeholder:text-slate-500"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] bg-slate-900/80 border-slate-700/80 rounded-xl text-xs h-10 text-white">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="BLS">BLS</SelectItem>
              <SelectItem value="ALS">ALS</SelectItem>
              <SelectItem value="PATIENT_TRANSPORT">Patient Transport</SelectItem>
              <SelectItem value="MORTUARY">Mortuary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="rounded-xl border-slate-700/80 bg-slate-900 text-slate-300 hover:text-white h-10 px-3"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => handleOpenModal()}
            className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs h-10 px-4 shadow-lg shadow-red-950/50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Ambulance
          </Button>
        </div>
      </div>

      {/* Fleet Table / Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Loading hospital ambulance fleet...</p>
        </div>
      ) : filteredAmbulances.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-slate-400">
            <Ambulance className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white">No Ambulances Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchQuery || typeFilter !== 'ALL'
              ? 'No vehicles match your current search or type filter.'
              : 'Add your hospital’s ambulances to start accepting and managing Emergency SOS dispatches.'}
          </p>
          {!searchQuery && typeFilter === 'ALL' && (
            <Button
              onClick={() => handleOpenModal()}
              className="mt-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add First Ambulance
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAmbulances.map(amb => {
            const isAssigned = Boolean(amb.currentDriverId);

            return (
              <div
                key={amb._id}
                className={`rounded-3xl border transition-all p-5 space-y-4 ${
                  amb.isOnDuty
                    ? 'border-amber-500/50 bg-gradient-to-b from-slate-900 via-amber-950/20 to-slate-950 shadow-lg shadow-amber-950/30'
                    : amb.isOnline
                    ? 'border-emerald-500/40 bg-gradient-to-b from-slate-900 via-emerald-950/10 to-slate-950'
                    : 'border-white/10 bg-slate-900/60 opacity-90'
                }`}
              >
                {/* Card Header: Reg & Status Badges */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white font-mono tracking-wide">
                        {amb.registrationNumber}
                      </span>
                      <Badge
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 ${
                          amb.ambulanceType === 'ALS'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : amb.ambulanceType === 'BLS'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : amb.ambulanceType === 'MORTUARY'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                        }`}
                      >
                        {amb.ambulanceType}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {amb.vehicleModel || 'Standard Emergency Vehicle'}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {amb.isOnDuty ? (
                      <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold">
                        🚨 On Duty
                      </Badge>
                    ) : amb.isOnline ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                        Online
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
                        Offline
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Equipment Level */}
                {amb.equipmentLevel && (
                  <div className="text-[11px] text-slate-300 bg-white/5 rounded-xl p-2.5 border border-white/5 space-y-0.5">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      Equipment:
                    </span>
                    <p className="line-clamp-2 leading-relaxed">{amb.equipmentLevel}</p>
                  </div>
                )}

                {/* Login badge + GPS freshness (Doc 02 §3.4) */}
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <Badge className={amb.loginStatus === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : amb.loginStatus === 'invited' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}>
                    Login: {amb.loginStatus === 'active' ? 'Active' : amb.loginStatus === 'invited' ? 'Invited' : 'None'}
                  </Badge>
                  {amb.loginStatus !== 'active' && amb.loginEmail && (
                    <button onClick={async () => { try { await api.post(`/hospitals/ambulances/${amb._id}/resend-invite`, {}); toast.success('Invite bhej diya'); } catch (e: any) { toast.error(e.response?.data?.message || 'Invite failed'); } }}
                      className="text-sky-300 underline">Resend invite</button>
                  )}
                  {(() => {
                    const upd = amb.currentLocation?.updatedAt ? new Date(amb.currentLocation.updatedAt).getTime() : 0;
                    const stale = !upd || Date.now() - upd > 120000;
                    return (
                      <span className={stale ? 'text-amber-300' : 'text-slate-400'}>
                        {stale ? '⚠ GPS nahi mil raha, dispatch me nahi aayegi' : `📍 GPS ${Math.max(0, Math.round((Date.now() - upd) / 1000))}s pehle`}
                      </span>
                    );
                  })()}
                </div>

                {/* Driver Info */}
                <div className="rounded-2xl bg-white/5 border border-white/5 p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white">
                        {amb.driverName || amb.currentDriverId?.name || 'No Driver Assigned'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {amb.driverPhone || amb.currentDriverPhone || amb.currentDriverId?.contactNumber || 'No phone set'}
                      </p>
                    </div>
                  </div>

                  {(amb.driverPhone || amb.currentDriverPhone) && (
                    <a
                      href={`tel:${amb.driverPhone || amb.currentDriverPhone}`}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                      title="Call Driver"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Emergency support toggle */}
                <div className="flex items-center justify-between text-xs rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                  <span className="text-slate-300 font-semibold">Emergency Support</span>
                  <Switch checked={amb.emergencySupport} onCheckedChange={() => handleToggleEmergencySupport(amb)} className="data-[state=checked]:bg-emerald-500" />
                </div>

                {/* Toggles: Online & Emergency Support */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={amb.isOnline}
                      disabled={amb.isOnDuty}
                      onCheckedChange={() => handleToggleOnline(amb)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                    <span className="text-slate-300 text-[11px] font-semibold">
                      {amb.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(amb)}
                      className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                      title="Edit Ambulance"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(amb._id)}
                      className="h-8 w-8 p-0 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      title="Delete Ambulance"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Ambulance className="w-5 h-5 text-red-500" />
              {editingAmbulance ? 'Edit Ambulance' : 'Register New Ambulance'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Enter vehicle registration, type, medical equipment, and staff driver assignment.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAmbulance} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                Vehicle Registration Number *
              </Label>
              <Input
                placeholder="e.g. MP-20-AB-1234"
                value={formData.registrationNumber}
                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                required
                className="bg-slate-950 border-slate-700 text-white text-xs h-10 font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                Vehicle Model
              </Label>
              <Input
                placeholder="e.g. Force Traveller, Tata Winger"
                value={formData.vehicleModel}
                onChange={e => setFormData({ ...formData, vehicleModel: e.target.value })}
                className="bg-slate-950 border-slate-700 text-white text-xs h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Ambulance Type
                </Label>
                <Select
                  value={formData.ambulanceType}
                  onValueChange={(val: any) => setFormData({ ...formData, ambulanceType: val })}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white text-xs h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="BLS">BLS (Basic Life Support)</SelectItem>
                    <SelectItem value="ALS">ALS (Advanced Life Support)</SelectItem>
                    <SelectItem value="PATIENT_TRANSPORT">Patient Transport</SelectItem>
                    <SelectItem value="MORTUARY">Mortuary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Driver Name</Label>
                <Input placeholder="Driver ka naam" value={formData.driverName}
                  onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Driver Phone</Label>
                <Input placeholder="10 digit mobile" value={formData.driverPhone}
                  onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Login Email (optional)</Label>
                <Input placeholder="driver@email.com" value={formData.loginEmail}
                  onChange={e => setFormData({ ...formData, loginEmail: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-10" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                Equipment Level & Medical Assets
              </Label>
              <Input
                placeholder="e.g. Oxygen Cylinder, Defibrillator, Ventilator, Stretcher"
                value={formData.equipmentLevel}
                onChange={e => setFormData({ ...formData, equipmentLevel: e.target.value })}
                className="bg-slate-950 border-slate-700 text-white text-xs h-10"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-red-950/50"
              >
                {saving ? 'Saving...' : editingAmbulance ? 'Update Ambulance' : 'Register Ambulance'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <EmergencyToggleConfirm open={masterConfirm.open} turningOn={masterConfirm.value}
        onConfirm={confirmMasterToggle} onCancel={() => setMasterConfirm({ open: false, value: false })} />
      <EmergencyToggleConfirm open={perAmbConfirm.open} turningOn={perAmbConfirm.value}
        onConfirm={confirmPerAmbToggle} onCancel={() => setPerAmbConfirm({ open: false, amb: null, value: false })} />

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deleteConfirmId)} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-sm rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Remove Ambulance?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Are you sure you want to remove this ambulance from your hospital fleet? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteConfirmId(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={handleDeleteAmbulance}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-10 px-5 rounded-xl"
            >
              {deleting ? 'Deleting...' : 'Confirm Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
