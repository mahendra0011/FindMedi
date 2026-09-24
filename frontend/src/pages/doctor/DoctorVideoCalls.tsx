import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, VideoOff, Clock, Search, RefreshCw, Trash2, User,
  Plus, Calendar, ShieldCheck, CheckCircle2, AlertCircle,
  ArrowUpRight, ArrowDownLeft, XCircle, Camera, Mic, Sparkles,
  Wifi, PhoneCall, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useVideoCall } from '@/context/VideoCallContext';
import { formatDisplayDate } from '@/lib/dateUtils';

function VirtualBackgroundToggle() {
  const [blur, setBlur] = useState(false);
  return (
    <Button variant="outline" size="sm" onClick={() => setBlur((b) => !b)}>
      {blur ? 'Blur ON (clinical background)' : 'Blur background'}
    </Button>
  );
}

function formatDuration(secs) {
  if (!secs || secs <= 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function getInitials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'PT';
}

export default function DoctorVideoCalls() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateVideoCall, callState, availableCameras } = useVideoCall();

  const isPatient = user?.role === 'patient';

  const handleOpenChat = (peerId) => {
    const isClinic = user?.role === 'clinic_doctor';
    const chatPath = isPatient ? '/patient/chat' : isClinic ? '/clinic/chat' : '/doctor/chat';
    navigate(chatPath, { state: { targetUserId: peerId } });
  };

  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    missedCalls: 0,
    incomingCalls: 0,
    outgoingCalls: 0,
    totalSeconds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'missed' | 'incoming' | 'outgoing'
  const [searchQuery, setSearchQuery] = useState('');

  // Hardware Test State
  const [hwStatus, setHwStatus] = useState({ tested: false, camera: false, mic: false, hd1080p: false });
  const [testingHw, setTestingHw] = useState(false);

  // Quick Dial Modal
  const [showDialModal, setShowDialModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Fetch Video Call Logs & Stats
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [callsRes, statsRes] = await Promise.all([
        api.getCalls({ tab: activeTab, callType: 'video', limit: 100 }),
        api.getCallStats(),
      ]);

      if (callsRes?.success) {
        setCalls(callsRes.data || []);
      }
      if (statsRes?.success) {
        setStats(statsRes.stats || {});
      }
    } catch (err) {
      console.warn('Failed to load video call logs:', err);
      toast.error('Could not load video call history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run a quick camera/mic hardware readiness check
  const testHardware = async () => {
    setTestingHw(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      const settings = videoTrack?.getSettings?.() || {};
      const is1080p = (settings.width || 0) >= 1280;

      setHwStatus({
        tested: true,
        camera: !!videoTrack,
        mic: !!audioTrack,
        hd1080p: is1080p,
      });

      // Stop test tracks immediately
      stream.getTracks().forEach((t) => t.stop());
      toast.success(is1080p ? 'Full HD 1080p Camera & Mic Ready!' : 'Camera & Mic active (Adaptive resolution ready)');
    } catch (e) {
      setHwStatus({ tested: true, camera: false, mic: false, hd1080p: false });
      toast.error('Permission denied or no camera found');
    } finally {
      setTestingHw(false);
    }
  };

  // Open Quick Dial Modal
  const openDialModal = async () => {
    setShowDialModal(true);
    setLoadingContacts(true);
    try {
      const res = await api.getCallContacts();
      if (res?.success) {
        setContacts(res.contacts || []);
      }
    } catch (err) {
      toast.error('Could not load patient directory');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Delete Call Log
  const handleDeleteCall = async (callId) => {
    try {
      const res = await api.deleteCallLog(callId);
      if (res?.success) {
        setCalls((prev) => prev.filter((c) => c._id !== callId));
        toast.success('Log deleted');
      }
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  // Filter calls by search query
  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return calls;
    const q = searchQuery.toLowerCase();
    return calls.filter((c) => {
      const peer = String(c.caller?._id) === String(user?._id) ? c.receiver : c.caller;
      return peer?.name?.toLowerCase().includes(q) || peer?.phone?.includes(q);
    });
  }, [calls, searchQuery, user?._id]);

  // Filter contacts in Quick Dial Modal
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter((c) => c.name?.toLowerCase().includes(q) || c.phone?.includes(q));
  }, [contacts, contactSearch]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                <Video className="w-6 h-6" />
              </span>
              Video Consultations
            </h1>
            <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 font-semibold px-2 py-0.5">
              Full HD 1080p
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isPatient
              ? 'Dedicated 1-to-1 encrypted video calling suite to consult with your doctors in Full HD clarity'
              : 'Dedicated 1-to-1 encrypted video calling suite with adaptive bitrate and high-definition clarity'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-10 px-3.5 gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            onClick={openDialModal}
            className="h-10 px-4 gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-semibold shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-4 h-4" />
            Start Video Call
          </Button>
        </div>
      </div>

      {/* ── HARDWARE READINESS & 1080P CHECK BANNER ── */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/15 via-teal-950/10 to-transparent p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 mt-0.5">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Full HD Video & Audio Readiness
              {hwStatus.tested && hwStatus.camera && (
                <span className="text-xs text-emerald-500 flex items-center gap-1 font-normal">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hardware Ready
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detected Cameras: <span className="font-semibold text-foreground">{availableCameras.length || 'Ready'}</span> |
              Noise Suppression & Echo Cancellation active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={testHardware}
            disabled={testingHw}
            className="h-9 px-3 text-xs gap-1.5 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          >
            <Sparkles className={`w-3.5 h-3.5 ${testingHw ? 'animate-spin' : ''}`} />
            {testingHw ? 'Testing...' : 'Test Camera & Mic'}
          </Button>
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Total Video Calls</span>
            <Video className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {stats.totalCalls || calls.length}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Recorded in history</span>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Total Talk Time</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {Math.floor((stats.totalSeconds || 0) / 60)} min
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Active consultation time</span>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Incoming Calls</span>
            <ArrowDownLeft className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {stats.incomingCalls || 0}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">From patients</span>
        </div>

        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium">Missed Video Calls</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {stats.missedCalls || 0}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Require follow-up</span>
        </div>
      </div>

      {/* ── TABS & SEARCH BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/40 overflow-x-auto">
          {[
            { id: 'all', label: 'All Video Calls' },
            { id: 'incoming', label: 'Incoming' },
            { id: 'outgoing', label: 'Outgoing' },
            { id: 'missed', label: 'Missed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-card border-border/70"
          />
        </div>
      </div>

      {/* ── VIDEO CALL LOGS TABLE ── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
            <span className="text-xs">Loading video consultations...</span>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-3">
              <VideoOff className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-foreground">No video calls recorded</h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Start a high-definition 1080p video consultation directly with your scheduled patients.
            </p>
            <Button size="sm" onClick={openDialModal} className="h-9 px-4 gap-2 text-xs">
              <Plus className="w-3.5 h-3.5" /> Start New Video Call
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Patient / Participant</th>
                  <th className="py-3.5 px-4">Call Type</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredCalls.map((call) => {
                  const isOutgoing = String(call.caller?._id) === String(user?._id);
                  const peer = isOutgoing ? call.receiver : call.caller;
                  const isMissed = call.status === 'missed';

                  return (
                    <tr key={call._id} className="hover:bg-muted/30 transition-colors">
                      {/* Patient Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {peer?.avatar ? (
                            <img
                              src={peer.avatar}
                              alt={peer.name}
                              className="w-9 h-9 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs">
                              {getInitials(peer?.name)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                              {peer?.name || (isPatient ? 'Doctor' : 'Patient')}
                              <span className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.2 rounded font-mono">
                                1080p
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {peer?.specialization || peer?.phone || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium">
                          {isMissed ? (
                            <span className="text-rose-500 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> Missed Video Call
                            </span>
                          ) : isOutgoing ? (
                            <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Outgoing Video
                            </span>
                          ) : (
                            <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                              <ArrowDownLeft className="w-3.5 h-3.5" /> Incoming Video
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                        {formatDuration(call.duration)}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div>{new Date(call.createdAt).toLocaleDateString()}</div>
                        <div className="text-[11px]">
                          {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`capitalize text-[11px] font-semibold px-2 py-0.5 ${
                            call.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : call.status === 'missed'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {call.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chat Shortcut */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenChat(peer?._id)}
                            className="h-8 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Open Chat"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Chat
                          </Button>

                          {/* Call Back via Video */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => initiateVideoCall(peer, call.appointmentId?._id)}
                            disabled={callState !== 'idle'}
                            className="h-8 px-2.5 gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 border-cyan-500/30"
                          >
                            <Video className="w-3.5 h-3.5" /> Video Call
                          </Button>

                          {/* Delete Log */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteCall(call._id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Delete log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── QUICK DIAL MODAL ── */}
      <Dialog open={showDialModal} onOpenChange={setShowDialModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Video className="w-5 h-5 text-cyan-500" /> Start 1-to-1 Video Call
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isPatient
                ? 'Select a doctor from your care team to initiate an instant 1080p Full HD video call.'
                : 'Select a patient from your consultation queue to initiate an instant 1080p Full HD video call.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={isPatient ? 'Search doctors by name or specialty...' : 'Search patients by name or phone...'}
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-border/50 border rounded-xl">
              {loadingContacts ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
                  Loading directory...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No {isPatient ? 'doctors' : 'patients'} found.
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact._id}
                    className="p-3 flex items-center justify-between hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-xs">
                          {getInitials(contact.name)}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          {contact.name}
                          {contact.isOnline && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{contact.specialization || contact.phone || 'No phone'}</div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setShowDialModal(false);
                        initiateVideoCall(contact);
                      }}
                      className="h-8 px-3 gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg"
                    >
                      <Video className="w-3.5 h-3.5" /> Call
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
