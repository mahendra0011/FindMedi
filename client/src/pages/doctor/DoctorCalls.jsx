import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock,
  Disc, Search, RefreshCw, Trash2, User, Play, Pause,
  Download, MessageCircle, Plus, Calendar, ShieldCheck,
  CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownLeft, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { api, resolveFileUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useAudioCall } from '@/context/AudioCallContext';
import { formatDisplayDate } from '@/lib/dateUtils';

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

export default function DoctorCalls() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { initiateCall, callState } = useAudioCall();

  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    missedCalls: 0,
    incomingCalls: 0,
    outgoingCalls: 0,
    recordedCalls: 0,
    totalSeconds: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'missed' | 'incoming' | 'outgoing' | 'recorded'
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Dial Modal
  const [showDialModal, setShowDialModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Audio Recording Player State
  const [playingRecordingId, setPlayingRecordingId] = useState(null);

  // Fetch Call Logs & Stats
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [callsRes, statsRes] = await Promise.all([
        api.getCalls({ tab: activeTab, limit: 100 }),
        api.getCallStats(),
      ]);

      if (callsRes?.success) {
        setCalls(callsRes.data || []);
      }
      if (statsRes?.success) {
        setStats(statsRes.stats || {});
      }
    } catch (err) {
      console.warn('Failed to load call logs:', err);
      toast.error('Could not load call history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Contacts Directory for Quick Dial
  const openDialModal = async () => {
    setShowDialModal(true);
    setLoadingContacts(true);
    try {
      const res = await api.getCallContacts();
      if (res?.success) {
        setContacts(res.contacts || []);
      }
    } catch (e) {
      console.warn('Error fetching contacts:', e);
    } finally {
      setLoadingContacts(false);
    }
  };

  // Filtered Calls list
  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return calls;
    const q = searchQuery.toLowerCase();
    return calls.filter((c) => {
      const isCaller = String(c.caller?._id || c.caller) === String(user?._id);
      const peer = isCaller ? c.receiver : c.caller;
      return (
        (peer?.name || '').toLowerCase().includes(q) ||
        (peer?.phone || '').toLowerCase().includes(q) ||
        (peer?.email || '').toLowerCase().includes(q)
      );
    });
  }, [calls, searchQuery, user]);

  // Filtered Contacts in Quick Dial modal
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

  // Delete single call
  const handleDeleteCall = async (callId) => {
    try {
      await api.deleteCallLog(callId);
      setCalls((prev) => prev.filter((c) => c._id !== callId));
      toast.success('Call log deleted');
    } catch (e) {
      toast.error('Failed to delete call log');
    }
  };

  // Clear all call logs
  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your call history?')) return;
    try {
      await api.clearAllCallLogs();
      setCalls([]);
      setStats((s) => ({ ...s, totalCalls: 0, missedCalls: 0, incomingCalls: 0, outgoingCalls: 0, totalSeconds: 0 }));
      toast.success('Call history cleared');
    } catch (e) {
      toast.error('Failed to clear call history');
    }
  };

  // Initiate call to contact
  const handleStartCall = (peer) => {
    if (!peer) return;
    setShowDialModal(false);
    initiateCall(peer);
  };

  const isPatient = user?.role === 'patient';

  // Navigate to chat
  const handleOpenChat = (peerId) => {
    const isClinic = user?.role === 'clinic_doctor';
    const chatPath = isPatient ? '/patient/chat' : isClinic ? '/clinic/chat' : '/doctor/chat';
    navigate(chatPath, { state: { targetUserId: peerId } });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-sm p-6 rounded-3xl border border-border/70 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted 1-to-1 Audio Hub</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-foreground">
            {isPatient ? 'Audio Calls & Doctor Consultations' : 'Audio Calls & Consultation Logs'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isPatient
              ? 'Make crystal-clear WebRTC audio calls to your doctors, review missed calls, and listen to recordings.'
              : 'Make crystal-clear WebRTC audio calls to patients, review missed calls, and listen to recordings.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="rounded-xl h-10 gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {calls.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="rounded-xl h-10 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}

          <Button
            onClick={openDialModal}
            className="rounded-xl h-10 gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
          >
            <Phone className="w-4 h-4" />
            New Audio Call
          </Button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Calls */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Calls</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-foreground">{stats.totalCalls || 0}</p>
          <p className="text-[10px] text-muted-foreground">All logged calls</p>
        </div>

        {/* Incoming */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Incoming</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <PhoneIncoming className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-foreground">{stats.incomingCalls || 0}</p>
          <p className="text-[10px] text-muted-foreground">Received from patients</p>
        </div>

        {/* Outgoing */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Outgoing</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <PhoneOutgoing className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-foreground">{stats.outgoingCalls || 0}</p>
          <p className="text-[10px] text-muted-foreground">Doctor initiated</p>
        </div>

        {/* Missed */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Missed</span>
            <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <PhoneMissed className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-destructive">{stats.missedCalls || 0}</p>
          <p className="text-[10px] text-muted-foreground">Require callback</p>
        </div>

        {/* Talk Time */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Talk Time</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold font-heading text-foreground truncate">
            {formatDuration(stats.totalSeconds || 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">Total connected time</p>
        </div>

        {/* Recordings */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Recordings</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Disc className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-heading text-foreground">{stats.recordedCalls || 0}</p>
          <p className="text-[10px] text-muted-foreground">Saved audio files</p>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/60">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'all', label: 'All Calls', count: stats.totalCalls },
            { key: 'missed', label: 'Missed', count: stats.missedCalls, badgeColor: 'bg-destructive text-white' },
            { key: 'incoming', label: 'Incoming', count: stats.incomingCalls },
            { key: 'outgoing', label: 'Outgoing', count: stats.outgoingCalls },
            { key: 'recorded', label: 'Recordings', count: stats.recordedCalls, badgeColor: 'bg-amber-500 text-white' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === tab.key
                      ? 'bg-white/20 text-white'
                      : tab.badgeColor || 'bg-muted text-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name or phone..."
            className="pl-9 h-9 text-xs rounded-xl bg-muted/40"
          />
        </div>
      </div>

      {/* ── Call History Cards / List ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-card border border-dashed border-border/80 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/80 text-muted-foreground mx-auto flex items-center justify-center">
            <Phone className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No call history found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery
              ? 'No call records matched your search query.'
              : 'You have not made or received any audio calls in this category yet.'}
          </p>
          <Button onClick={openDialModal} size="sm" className="rounded-xl text-xs gap-1.5 mt-2">
            <Plus className="w-3.5 h-3.5" /> Start First Call
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCalls.map((call) => {
            const isCaller = String(call.caller?._id || call.caller) === String(user?._id);
            const peer = isCaller ? call.receiver : call.caller;
            const isMissed = call.status === 'missed';
            const isRejected = call.status === 'rejected';
            const isBusy = call.status === 'busy';
            const hasRecording = Boolean(call.recordingUrl);

            return (
              <motion.div
                key={call._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 hover:shadow-sm transition-all gap-3.5"
              >
                {/* Left: Direction + Patient Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Direction Badge Icon */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isMissed
                        ? 'bg-destructive/10 text-destructive'
                        : isCaller
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    {isMissed ? (
                      <PhoneMissed className="w-5 h-5" />
                    ) : isCaller ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5" />
                    )}
                  </div>

                  {/* Patient Avatar */}
                  <div className="relative w-11 h-11 rounded-full overflow-hidden bg-muted border border-border/70 flex items-center justify-center flex-shrink-0">
                    {peer?.avatar ? (
                      <img src={peer.avatar} alt={peer.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{getInitials(peer?.name)}</span>
                    )}
                  </div>

                  {/* Peer Meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">{peer?.name || (isPatient ? 'Doctor' : 'Patient')}</h4>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 uppercase font-medium">
                        {peer?.specialization || (peer?.role ? peer.role.replace('_', ' ') : (isPatient ? 'Doctor' : 'Patient'))}
                      </Badge>
                      {hasRecording && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 rounded-full">
                          <Disc className="w-2.5 h-2.5" /> Audio Recorded
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{peer?.phone || peer?.email || '1-to-1 Audio'}</span>
                      {call.appointmentId?.date && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                            <Calendar className="w-3 h-3" />
                            {formatDisplayDate(call.appointmentId.date)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle / Right: Call Timers & Recordings & Actions */}
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between md:justify-end gap-3.5 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                  {/* Timestamp & Duration */}
                  <div className="text-left md:text-right">
                    <p className="text-xs font-semibold text-foreground">
                      {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(call.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      {' • '}
                      <span className={`font-mono font-medium ${isMissed ? 'text-destructive font-bold' : ''}`}>
                        {isMissed ? 'Missed' : isRejected ? 'Declined' : isBusy ? 'Busy' : formatDuration(call.duration)}
                      </span>
                    </p>
                  </div>

                  {/* Audio Player if recorded */}
                  {hasRecording && (
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-xl border border-border/50">
                      <audio
                        controls
                        src={resolveFileUrl(call.recordingUrl)}
                        className="h-7 w-40 max-w-[160px]"
                        preload="none"
                      />
                      <a
                        href={resolveFileUrl(call.recordingUrl)}
                        download={`call-${call._id}.webm`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                        title="Download audio recording"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Action Buttons: Call Back, Message, Delete */}
                  <div className="flex items-center gap-1.5">
                    {/* Call Back Button */}
                    <Button
                      size="sm"
                      onClick={() => handleStartCall(peer)}
                      disabled={callState !== 'idle'}
                      className="rounded-xl h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                      title="Initiate Audio Call"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Back
                    </Button>

                    {/* Chat Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenChat(peer?._id)}
                      className="rounded-xl h-8 w-8 p-0"
                      title="Message Patient"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>

                    {/* Delete Log */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCall(call._id)}
                      className="rounded-xl h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete Call Log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Quick Dial / Contact Picker Modal ── */}
      <Dialog open={showDialModal} onOpenChange={setShowDialModal}>
        <DialogContent className="max-w-md rounded-[28px] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Phone className="w-5 h-5 text-emerald-600" />
              <span>Start 1-to-1 Audio Call</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isPatient
                ? 'Select a doctor from your care team or search by name.'
                : 'Select a patient from your recent consultations or search by name.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder={isPatient ? 'Search doctor by name or specialty...' : 'Search patient by name or phone...'}
                className="pl-9 text-xs rounded-xl"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {loadingContacts ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {isPatient ? 'Loading doctor contacts...' : 'Loading patient contacts...'}
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No matching {isPatient ? 'doctors' : 'patients'} found.
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact._id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border/50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-card border border-border/70 flex items-center justify-center flex-shrink-0">
                        {contact.avatar ? (
                          <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">{getInitials(contact.name)}</span>
                        )}
                        {contact.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-card" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{contact.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {contact.specialization || contact.phone || contact.email}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleStartCall(contact)}
                      className="rounded-xl h-8 px-3 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call
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
