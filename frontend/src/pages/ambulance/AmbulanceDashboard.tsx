import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Ambulance as AmbIcon, MapPin, Phone, Navigation, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAmbulanceGps } from '@/hooks/useAmbulanceGps';
import { EmergencyToggleConfirm } from '@/components/emergency/EmergencyToggleConfirm';
import { toast } from 'sonner';

const mapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

const STAGE_MAP = ['assigned', 'reached_pickup', 'heading_to_hospital', 'reached_hospital'];
const STAGE_TO_STEP: Record<string, number> = { assigned: 0, reached_pickup: 1, heading_to_hospital: 2, reached_hospital: 3, completed: 3 };

export default function AmbulanceDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const setTab = (t: string) => setSearchParams(t === 'overview' ? {} : { tab: t });

  const [amb, setAmb] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOnline, setConfirmOnline] = useState<{ open: boolean; value: boolean }>({ open: false, value: false });
  const [gpsOk, setGpsOk] = useState<string>('GPS check ho raha hai…');
  const [step, setStep] = useState(0);
  const [advancing, setAdvancing] = useState(false);
  const [stats, setStats] = useState<any>({ todayCount: 0, avgResponseMin: 0, totalCompleted: 0 });
  const [recentJobs, setRecentJobs] = useState<any[]>([]);

  useAmbulanceGps(Boolean(amb?.isOnline));

  const load = async () => {
    try {
      const me: any = await api.get('/ambulance/me');
      setAmb(me.ambulance);
      const j: any = await api.get('/ambulance/me/active-job');
      setJob(j.job || null);
      if (j.job) setStep(STAGE_TO_STEP[j.job.progressStage] ?? (j.job.status === 'en_route' ? 2 : 1));
      const s: any = await api.get('/ambulance/me/stats').catch(() => null);
      if (s) setStats({ todayCount: s.todayCount || 0, avgResponseMin: s.avgResponseMin || 0, totalCompleted: s.totalCompleted || 0 });
      const rj: any = await api.get('/ambulance/me/recent-jobs').catch(() => null);
      if (rj?.jobs) setRecentJobs(rj.jobs);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Load failed');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const s = getSocket();
    if (!s || !amb?._id) return;
    s.emit('join_ambulance_room', { ambulanceId: amb._id });
    return () => { s.emit('leave_ambulance_room', { ambulanceId: amb._id }); };
  }, [amb?._id]);

  const doOnlineToggle = async (online: boolean) => {
    setConfirmOnline({ open: false, value: false });
    try {
      if (online) {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000 }));
        const res: any = await api.put('/ambulance/me/online', {
          online: true, lat: pos.coords.latitude, lng: pos.coords.longitude,
        });
        setAmb((p: any) => ({ ...p, isOnline: res.isOnline }));
        setGpsOk('Good, abhi update hua');
        toast.success('Online — emergency alerts aayenge');
      } else {
        const res: any = await api.put('/ambulance/me/online', { online: false });
        setAmb((p: any) => ({ ...p, isOnline: res.isOnline }));
        toast.info('Offline');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'GPS permission chahiye');
      setGpsOk('GPS permission nahi mili');
    }
  };

  const advanceProgress = async () => {
    if (!job?._id || step >= 3) return;
    const nextStage = STAGE_MAP[step + 1];
    setAdvancing(true);
    try {
      await api.put(`/emergency-sos/${job._id}/progress`, { stage: nextStage });
      setStep((s) => Math.min(3, s + 1));
      toast.success('Status updated — patient ko bhi dikh gaya');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setAdvancing(false);
    }
  };

  const completeJob = async () => {
    if (!job?._id) return;
    try {
      await api.put(`/emergency-sos/${job._id}/complete`, {});
      toast.success('Job complete');
      setJob(null); setStep(3);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Complete failed'); }
  };

  if (loading) return <div className="p-8 text-center">Loading…</div>;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4 pb-16">
      {/* Header card */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600/10 flex items-center justify-center">
            <AmbIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-black text-lg font-mono">{amb?.registrationNumber}</p>
            <p className="text-xs text-muted-foreground">{amb?.ambulanceType} · {amb?.hospitalId?.name}</p>
          </div>
          <span className={`relative flex h-3 w-3`}>
            {amb?.isOnline && (
              <motion.span animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-emerald-500" />
            )}
            <span className={`relative rounded-full h-3 w-3 ${amb?.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </span>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['overview', 'active', 'vehicle'] as const).map((t) => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="rounded-full capitalize flex-1">
            {t === 'overview' ? 'Overview' : t === 'active' ? 'Active' : 'Vehicle'}
          </Button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Today's stats */}
              <div className="grid grid-cols-3 gap-2">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-black tabular-nums">{stats.todayCount}</p>
                  <p className="text-[10px] text-muted-foreground">Aaj ke jobs</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-black tabular-nums">{stats.avgResponseMin}m</p>
                  <p className="text-[10px] text-muted-foreground">Avg response</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-2xl font-black tabular-nums">{stats.totalCompleted}</p>
                  <p className="text-[10px] text-muted-foreground">Total complete</p>
                </CardContent></Card>
              </div>

              {/* Online toggle */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{amb?.isOnline ? 'Online' : 'Offline'}</p>
                    <Switch checked={Boolean(amb?.isOnline)} disabled={amb?.isOnDuty}
                      onCheckedChange={(v) => setConfirmOnline({ open: true, value: v })}
                      className="data-[state=checked]:bg-emerald-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">GPS: {gpsOk} · Screen on rakhein</p>
                  <p className="text-xs text-muted-foreground">Emergency Support: {amb?.hospitalId?.emergencySupport ? 'Hospital ne ON kiya (read-only)' : 'Hospital ne OFF kiya'}</p>
                </CardContent>
              </Card>
              <EmergencyToggleConfirm open={confirmOnline.open} turningOn={confirmOnline.value}
                onConfirm={() => doOnlineToggle(confirmOnline.value)} onCancel={() => setConfirmOnline({ open: false, value: false })} />

              {/* Recent jobs preview */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">Recent Jobs</h3>
                    <Link to="/ambulance/jobs" className="text-xs text-primary font-bold">Sab dekhein →</Link>
                  </div>
                  {recentJobs.slice(0, 3).map((j: any) => (
                    <div key={j._id} className="flex justify-between text-xs border-b py-2">
                      <span>{j.category || 'Emergency'} · {j.patientDetails?.name}</span>
                      <span className="text-muted-foreground">{j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-IN') : ''}</span>
                    </div>
                  ))}
                  {!recentJobs.length && <p className="text-xs text-muted-foreground">Koi job history nahi.</p>}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-xs text-muted-foreground">
                  Incoming SOS alerts full-screen call ki tarah aayenge (EmergencyFlowController). Accept ke baad hospital choose karein.
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'active' && (
            <div className="space-y-4">
              {job ? (
                <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                  <Card className="border-red-500/40">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                        <MapPin className="w-4 h-4" /> ACTIVE JOB — {job.category || 'Emergency'}
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Patient:</strong> {job.patientDetails?.name} {job.patientDetails?.age ? `(${job.patientDetails.age})` : ''} {job.patientDetails?.bloodGroup}</p>
                        <p className="text-xs text-muted-foreground">{job.location?.address}</p>
                        {job.patientDetails?.phone && (
                          <a href={`tel:${job.patientDetails.phone}`} className="inline-flex items-center gap-1 text-xs text-sky-600 font-bold"><Phone className="w-3 h-3" /> {job.patientDetails.phone}</a>
                        )}
                      </div>
                      {/* Stepper */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-muted-foreground">
                          {['Assigned', 'Pickup', 'Hospital', 'Done'].map((s, i) => (
                            <span key={s} className={step >= i ? 'text-primary' : ''}>{s}</span>
                          ))}
                        </div>
                        <div className="h-1 rounded bg-muted overflow-hidden">
                          <motion.div className="h-1 bg-primary" initial={{ width: 0 }} animate={{ width: `${(step / 3) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {job.location?.coordinates && (
                          <a target="_blank" rel="noreferrer"
                            href={mapsUrl(job.location.coordinates[1], job.location.coordinates[0])}>
                            <Button size="sm"><Navigation className="w-3.5 h-3.5 mr-1" /> Pickup Navigate</Button>
                          </a>
                        )}
                        {job.selectedHospitalId?.location?.coordinates && (
                          <a target="_blank" rel="noreferrer"
                            href={mapsUrl(job.selectedHospitalId.location.coordinates[1], job.selectedHospitalId.location.coordinates[0])}>
                            <Button size="sm" variant="outline"><Navigation className="w-3.5 h-3.5 mr-1" /> Hospital Navigate</Button>
                          </a>
                        )}
                        <Button size="sm" variant="secondary" disabled={advancing || step >= 3} onClick={advanceProgress}>
                          {advancing ? 'Updating…' : 'Aage badho'}
                        </Button>
                        <Button size="sm" className="bg-emerald-600" onClick={completeJob}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Job complete karein</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Currently koi active job nahi.</CardContent></Card>
              )}
            </div>
          )}

          {tab === 'vehicle' && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-bold text-sm">Ambulance Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Registration No.</p><p className="font-mono font-bold">{amb?.registrationNumber}</p></div>
                  <div><p className="text-xs text-muted-foreground">Type</p><p className="font-bold">{amb?.ambulanceType}</p></div>
                  <div><p className="text-xs text-muted-foreground">Model</p><p className="font-bold">{amb?.vehicleModel || '—'}</p></div>
                  <div><p className="text-xs text-muted-foreground">Hospital</p><p className="font-bold">{amb?.hospitalId?.name}</p></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Equipment</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(amb?.equipmentLevel || '').split(',').map((e: string) => e.trim()).filter(Boolean).map((e: string, i: number) => (
                      <motion.span key={`${e}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                        className="text-xs rounded-full bg-emerald-100 text-emerald-800 px-2 py-1 font-medium">{e}</motion.span>
                    ))}
                    {!(amb?.equipmentLevel || '').trim() && <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
                {amb?.hospitalId?.phone && (
                  <a href={`tel:${amb.hospitalId.phone}`}>
                    <Button variant="outline" size="sm" className="w-full">📞 Hospital ko call karein</Button>
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
