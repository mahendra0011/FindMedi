import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Clock, UserPlus, Search, Ticket, CalendarDays, CheckCircle2,
  AlertCircle, Phone, Stethoscope, ChevronRight, RotateCcw, Printer,
  Activity, ArrowRight, ShieldCheck, X, Eye, Volume2, Sparkles, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getISTDateString } from '@/lib/dateUtils';

interface ReceptionToken {
  token: string;
  patient: string;
  phone: string;
  uhid: string;
  age: string;
  gender: string;
  doctor: string;
  department: string;
  room: string;
  status: 'Waiting' | 'Vitals Pending' | 'Called' | 'In Consultation' | 'Completed' | 'Skipped';
  priority: 'Normal' | 'Senior Citizen' | 'Emergency / Priority';
  time: string;
  fee: string;
}

export default function ClinicReceptionDashboard() {

  const [activeTab, setActiveTab] = useState<'all' | 'waiting' | 'in_consultation' | 'completed'>('all');
  const [tokenCounter, setTokenCounter] = useState(0);
  const [showSlipModal, setShowSlipModal] = useState<ReceptionToken | null>(null);
  const [showTvDisplay, setShowTvDisplay] = useState(false);

  // Form State
  const [quickReg, setQuickReg] = useState({
    name: '',
    phone: '',
    age: '',
    gender: 'Male',
    bloodGroup: 'B+',
    doctorId: '',
    department: '',
    priority: 'Normal' as 'Normal' | 'Senior Citizen' | 'Emergency / Priority',
  });

  const [tokens, setTokens] = useState<ReceptionToken[]>([]);

  const [roster, setRoster] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [res, ro] = await Promise.all([
        api.getAppointments({ date: getISTDateString() }).catch(() => null),
        (api as any).getClinicRosterToday?.().catch(() => null),
      ]);
      if (ro?.roster) {
        setRoster(ro.roster);
        setQuickReg((q) => q.doctorId ? q : { ...q, doctorId: ro.roster[0]?._id ?? '', department: ro.roster[0]?.specialization ?? '' });
      }
      const list = Array.isArray(res) ? res : res?.data || [];
      const mapped: ReceptionToken[] = list.map((apt: any, idx: number) => ({
        token: String(apt.tokenNumber ?? idx + 1).padStart(2, '0'),
        patient: apt.patientName || apt.patient || 'Patient',
        phone: apt.phone || '—',
        uhid: apt.uhid || '—',
        age: apt.age ? String(apt.age) : '—',
        gender: apt.gender || '—',
        doctor: apt.doctorName || apt.doctor || '—',
        department: apt.department || apt.specialization || '—',
        room: apt.room ? String(apt.room) : '—',
        status: apt.status === 'Completed' ? 'Completed' : apt.status === 'In Consultation' ? 'In Consultation' : 'Waiting',
        priority: 'Normal',
        time: apt.time || '—',
        fee: '—',
      }));
      setTokens(mapped);
    } catch {
      // Keep state
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickReg.name.trim() || !quickReg.phone.trim()) {
      toast.error('Patient name and phone number are required');
      return;
    }

    const now = new Date();
    const chosen = roster.find((d: any) => String(d._id) === quickReg.doctorId);
    const department = chosen?.specialization || 'General Medicine';
    const todayStr = getISTDateString();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (!quickReg.doctorId) {
      toast.error('Select the consulting doctor from the roster');
      return;
    }

    try {
      const res: any = await api.post('/appointments/walk-in', {
        patient: {
          name: quickReg.name.trim(),
          age: quickReg.age ? Number(quickReg.age) : undefined,
          gender: quickReg.gender,
          phone: quickReg.phone.trim(),
          bloodGroup: quickReg.bloodGroup,
        },
        doctorId: quickReg.doctorId,
        department,
        date: todayStr,
        time: timeStr,
        type: 'Consultation',
        priority: quickReg.priority,
      });
      const appt = res?.appointment;
      if (!appt) {
        toast.error(res?.message || 'Walk-in registration failed');
        return;
      }
      const tokenStr = String(appt.tokenNumber ?? tokenCounter + 1).padStart(2, '0');
      setTokenCounter((n) => n + 1);
      const newToken: ReceptionToken = {
        token: tokenStr,
        patient: appt.patientName || appt.patient || quickReg.name.trim(),
        phone: quickReg.phone.trim(),
        uhid: appt.uhid || '—',
        age: quickReg.age || '—',
        gender: quickReg.gender,
        doctor: chosen?.name || '—',
        department,
        room: '—',
        status: 'Waiting',
        priority: quickReg.priority,
        time: appt.time || timeStr,
        fee: '—',
      };
      setTokens((prev) => [newToken, ...prev]);
      setShowSlipModal(newToken);
      toast.success(`Token #${tokenStr} issued for ${newToken.patient}`);

      // Reset Form
      setQuickReg({
        name: '',
        phone: '',
        age: '',
        gender: 'Male',
        bloodGroup: 'B+',
        doctorId: roster[0]?._id ?? '',
        department: roster[0]?.specialization ?? '',
        priority: 'Normal',
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Walk-in registration failed');
    }
  };

  const handleSendToVitals = (tok: ReceptionToken) => {
    setTokens(prev => prev.map(t => t.token === tok.token ? { ...t, status: 'Vitals Pending' } : t));
    toast.info(`Routed ${tok.patient} (Token #${tok.token}) to Nurse Station for Vitals measurement`);
  };

  const handleCallToRoom = (tok: ReceptionToken) => {
    setTokens(prev => prev.map(t => t.token === tok.token ? { ...t, status: 'Called' } : t));
    toast.success(`📢 Token #${tok.token} (${tok.patient}) called to ${tok.room} on reception audio display!`);
  };

  const handleMarkCompleted = (tok: ReceptionToken) => {
    setTokens(prev => prev.map(t => t.token === tok.token ? { ...t, status: 'Completed' } : t));
    toast.success(`Consultation completed for Token #${tok.token} (${tok.patient})`);
  };

  const filteredTokens = tokens.filter(t => {
    if (activeTab === 'waiting') return t.status === 'Waiting' || t.status === 'Vitals Pending';
    if (activeTab === 'in_consultation') return t.status === 'In Consultation' || t.status === 'Called';
    if (activeTab === 'completed') return t.status === 'Completed';
    return true;
  });

  const waitingCount = tokens.filter(t => t.status === 'Waiting' || t.status === 'Vitals Pending').length;
  const inConsultCount = tokens.filter(t => t.status === 'In Consultation' || t.status === 'Called').length;
  const completedCount = tokens.filter(t => t.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* ── 1. Front Desk Reception Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white p-6 rounded-3xl shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-teal-200">Patient Registration & Front Desk Console</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black mt-1">Reception / Front Desk</h1>
          <p className="text-sm text-teal-100 mt-0.5">Walk-in Registrations, Token Dispatch & Waiting Queue Management</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setShowTvDisplay(true)} className="gap-1.5 rounded-xl text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border-white/20">
            <Volume2 className="w-3.5 h-3.5" /> Lounge TV Display
          </Button>
          <Button variant="secondary" size="sm" onClick={loadData} className="gap-1.5 rounded-xl text-xs font-semibold">
            <RotateCcw className="w-3.5 h-3.5" /> Refresh Queue
          </Button>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-center">
            <p className="text-[10px] text-teal-200 font-medium">LATEST TOKEN</p>
            <p className="text-xl font-bold">#{tokenCounter}</p>
          </div>
        </div>
      </div>

      {/* ── 2. Reception KPIs (4 Fixed Parts: Overview) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border-teal-500/20 bg-teal-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Walk-ins Handled</p>
              <p className="text-2xl font-bold text-teal-700">{tokens.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Waiting in Lounge</p>
              <p className="text-2xl font-bold text-amber-700">{waitingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">In Consultation</p>
              <p className="text-2xl font-bold text-blue-700">{inConsultCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Completed Today</p>
              <p className="text-2xl font-bold text-emerald-700">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Quick Walk-in Registration & Live Queue Table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Walk-in Form (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" /> Instant Walk-in Registration (UHID)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleGenerateToken} className="space-y-3.5 text-xs">
                <div>
                  <label className="text-muted-foreground font-medium block mb-1">Patient Full Name *</label>
                  <Input
                    required
                    placeholder="e.g. Ramesh Chandra Verma"
                    value={quickReg.name}
                    onChange={e => setQuickReg({ ...quickReg, name: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Mobile Number *</label>
                    <Input
                      required
                      placeholder="9876543210"
                      value={quickReg.phone}
                      onChange={e => setQuickReg({ ...quickReg, phone: e.target.value })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Age (Years)</label>
                    <Input
                      placeholder="e.g. 34"
                      value={quickReg.age}
                      onChange={e => setQuickReg({ ...quickReg, age: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Gender</label>
                    <select
                      value={quickReg.gender}
                      onChange={e => setQuickReg({ ...quickReg, gender: e.target.value })}
                      className="w-full h-9 rounded-xl border bg-background px-3 text-xs"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Priority Level</label>
                    <select
                      value={quickReg.priority}
                      onChange={e => setQuickReg({ ...quickReg, priority: e.target.value as any })}
                      className="w-full h-9 rounded-xl border bg-background px-3 text-xs"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Senior Citizen">Senior Citizen (Priority)</option>
                      <option value="Emergency / Priority">Urgent / Emergency</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Consulting Doctor</label>
                    <select
                      value={quickReg.doctorId}
                      onChange={e => {
                        const doc = roster.find((d: any) => String(d._id) === e.target.value);
                        setQuickReg({ ...quickReg, doctorId: e.target.value, department: doc?.specialization || '' });
                      }}
                      className="w-full h-9 rounded-xl border bg-background px-3 text-xs font-semibold"
                    >
                      {roster.length === 0 ? (
                        <option value="">No doctors on roster</option>
                      ) : roster.map((d: any) => (
                        <option key={d._id} value={d._id}>{d.name} ({d.specialization})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground font-medium block mb-1">Department</label>
                    <Input
                      readOnly
                      value={quickReg.department}
                      className="h-9 text-xs bg-muted/30"
                    />
                  </div>
                </div>

                <div className="p-3 bg-muted/20 rounded-2xl flex items-center justify-between border">
                  <div>
                    <span className="font-semibold text-foreground text-xs block">Consultation Fee</span>
                    <span className="text-[10px] text-muted-foreground">Pricing is resolved server-side at the counter</span>
                  </div>
                  <span className="font-bold text-xs text-foreground">As per doctor's tariff</span>
                </div>

                <Button type="submit" className="w-full rounded-2xl h-10 font-bold bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm">
                  <Ticket className="w-4 h-4" /> Issue Token & Generate OPD Slip
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live Token Queue Table (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="rounded-3xl border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" /> Active OPD Lounge Queue ({filteredTokens.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Live token tracking with 1-click status actions</p>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${activeTab === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  All ({tokens.length})
                </button>
                <button
                  onClick={() => setActiveTab('waiting')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${activeTab === 'waiting' ? 'bg-amber-500 text-white shadow-xs' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  Waiting ({waitingCount})
                </button>
                <button
                  onClick={() => setActiveTab('in_consultation')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${activeTab === 'in_consultation' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  In Room ({inConsultCount})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all ${activeTab === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  Done ({completedCount})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5 max-h-[560px] overflow-y-auto">
              {filteredTokens.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No patients found in this queue tab
                </div>
              ) : (
                filteredTokens.map((item) => (
                  <div key={item.token} className="p-3.5 rounded-2xl border bg-muted/10 hover:bg-muted/20 transition-all text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-600/10 text-teal-700 font-black text-sm flex items-center justify-center border border-teal-600/20 shadow-xs">
                          #{item.token}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-foreground">{item.patient}</p>
                            {item.priority !== 'Normal' && (
                              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 border-rose-500/30">
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {item.age}y · {item.gender} · <span className="font-mono text-foreground font-semibold">{item.uhid}</span> · {item.phone}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            item.status === 'In Consultation' || item.status === 'Called'
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/30 font-semibold'
                              : item.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : item.status === 'Vitals Pending'
                              ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          }
                        >
                          {item.status}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{item.time}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-border/40 gap-2">
                      <div className="text-muted-foreground text-[11px]">
                        Consulting: <b className="text-foreground">{item.doctor}</b> ({item.room})
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs rounded-xl px-2.5 gap-1"
                          onClick={() => setShowSlipModal(item)}
                        >
                          <Printer className="w-3 h-3" /> Slip
                        </Button>

                        {item.status === 'Waiting' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs rounded-xl px-2.5 gap-1 text-purple-700 bg-purple-50 hover:bg-purple-100"
                            onClick={() => handleSendToVitals(item)}
                          >
                            <Activity className="w-3 h-3" /> Vitals
                          </Button>
                        )}

                        {item.status !== 'In Consultation' && item.status !== 'Completed' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs rounded-xl px-2.5 gap-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                            onClick={() => handleCallToRoom(item)}
                          >
                            <Volume2 className="w-3 h-3" /> Call Room
                          </Button>
                        )}

                        {item.status === 'In Consultation' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs rounded-xl px-2.5 gap-1 text-emerald-600 border-emerald-500/30"
                            onClick={() => handleMarkCompleted(item)}
                          >
                            <CheckCircle2 className="w-3 h-3" /> Mark Done
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── 4. Printable OPD Slip Modal ── */}
      <AnimatePresence>
        {showSlipModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-md rounded-3xl border shadow-2xl p-6 text-foreground space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-base">OPD Registration Slip</h3>
                </div>
                <button onClick={() => setShowSlipModal(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Thermal Receipt Style Card */}
              <div className="p-4 bg-muted/20 border-2 border-dashed rounded-2xl space-y-3 font-mono text-xs">
                <div className="text-center pb-2 border-b">
                  <h4 className="font-bold text-sm tracking-wide">CLINIC OPD REGISTRATION SLIP</h4>
                  <p className="text-[10px] text-muted-foreground">Retain this slip · show at consultation</p>
                </div>

                <div className="flex items-center justify-between text-base font-black py-1 bg-teal-500/10 px-3 rounded-xl text-teal-700">
                  <span>QUEUE TOKEN</span>
                  <span>#{showSlipModal.token}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">Patient Name:</span>
                    <b className="text-foreground">{showSlipModal.patient}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">UHID Number:</span>
                    <b className="text-foreground">{showSlipModal.uhid}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Age / Gender:</span>
                    <span>{showSlipModal.age} Y / {showSlipModal.gender}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Time / Date:</span>
                    <span>{showSlipModal.time} · {getISTDateString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Doctor / Room:</span>
                    <b className="text-foreground">{showSlipModal.doctor} ({showSlipModal.room})</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Fee:</span>
                    <b className="text-foreground font-bold">As per tariff</b>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="pt-2 text-center border-t">
                  <div className="h-9 w-4/5 mx-auto bg-gradient-to-r from-foreground via-muted-foreground to-foreground flex items-center justify-center text-background text-[9px] font-bold tracking-widest rounded-sm opacity-80">
                    ||||| | ||||| |||| ||||| || ||||
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1 block">SCAN AT CONSULTATION ROOM</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowSlipModal(null)} className="rounded-xl text-xs">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    window.print();
                    setShowSlipModal(null);
                  }}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Thermal Slip
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 5. Lounge TV Display Modal ── */}
      <AnimatePresence>
        {showTvDisplay && (
          <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white font-black flex items-center justify-center text-lg">
                  OPD
                </div>
                <div>
                  <h2 className="text-xl font-black">Central Polyclinic · Live Queue Display</h2>
                  <p className="text-xs text-slate-400">Please proceed to your assigned consultation room when your token is called</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowTvDisplay(false)} className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs">
                Exit TV Mode
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 flex-1">
              {(roster.length ? roster.map((d: any) => `Room ${roster.indexOf(d) + 1} (${d.name})`) : ['Room 1']).map((roomName: string, rIdx: number) => {
                const roomKey = `Room ${rIdx + 1}`;
                const inRoom = tokens.find(t => t.room === roomKey && (t.status === 'In Consultation' || t.status === 'Called'));
                const waitingInRoom = tokens.filter(t => t.room === roomKey && (t.status === 'Waiting' || t.status === 'Vitals Pending'));

                return (
                  <div key={rIdx} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col">
                    <div className="pb-3 border-b border-slate-800">
                      <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">{roomName}</span>
                    </div>

                    <div className="py-6 text-center">
                      <p className="text-xs text-slate-400 font-semibold mb-2">NOW SERVING</p>
                      <div className="w-24 h-24 mx-auto rounded-3xl bg-teal-500/20 border-2 border-teal-500 text-teal-400 flex items-center justify-center font-black text-4xl shadow-lg">
                        #{inRoom ? inRoom.token : '--'}
                      </div>
                      <p className="font-bold text-base text-white mt-3">{inRoom ? inRoom.patient : 'Waiting for patient'}</p>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-800">
                      <p className="text-xs font-semibold text-slate-400 mb-2">NEXT UP IN QUEUE:</p>
                      <div className="space-y-1.5">
                        {waitingInRoom.slice(0, 3).map((w, wIdx) => (
                          <div key={wIdx} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-800/60">
                            <span className="font-mono font-bold text-teal-400">Token #{w.token}</span>
                            <span className="text-slate-300 font-medium">{w.patient}</span>
                          </div>
                        ))}
                        {waitingInRoom.length === 0 && (
                          <p className="text-xs text-slate-500 italic">No waiting patients</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
