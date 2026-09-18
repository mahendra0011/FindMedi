import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock, Calendar, Clock, Video, Phone, MessageSquare,
  Search, User, FileText, CheckCircle2, Eye, Filter, Sparkles,
  MapPin, Droplet, Mail, AlertCircle, CalendarDays, ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getISTDateString, formatDisplayDate } from '@/lib/dateUtils';
import { parseTime, subSlotFor } from '@/lib/timeSlots';

/**
 * Calculates human-readable relative days from today (IST YYYY-MM-DD)
 */
function getRelativeDays(targetDate, todayStr) {
  if (!targetDate) return '';
  if (targetDate === todayStr) return 'Today';

  const [y1, m1, d1] = todayStr.split('-').map(Number);
  const [y2, m2, d2] = targetDate.split('-').map(Number);
  const dt1 = new Date(y1, m1 - 1, d1);
  const dt2 = new Date(y2, m2 - 1, d2);
  const diffDays = Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === -1) return 'Yesterday';
  return `${Math.abs(diffDays)} days ago`;
}

function getModeDetails(appt) {
  const mode = (appt.appointmentMode || '').toLowerCase();
  const type = (appt.type || '').toLowerCase();
  const intakeMode = (appt.preConsultationDetails?.appointmentMode || appt.preConsultationDetails?.mode || '').toLowerCase();

  if (mode === 'video' || type.includes('video') || intakeMode === 'video') {
    return {
      mode: 'video',
      label: 'Video Call',
      icon: Video,
      badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400',
      gradient: 'from-emerald-500 to-teal-600',
      borderAccent: 'border-l-emerald-500',
      tagColor: 'text-emerald-600',
    };
  }
  if (mode === 'audio' || mode === 'call' || mode === 'voice' || type.includes('audio') || type.includes('voice') || intakeMode === 'audio' || intakeMode === 'voice') {
    return {
      mode: 'audio',
      label: 'Audio / Voice Call',
      icon: Phone,
      badgeClass: 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:bg-teal-500/15 dark:text-teal-400',
      gradient: 'from-teal-500 to-cyan-600',
      borderAccent: 'border-l-teal-500',
      tagColor: 'text-teal-600',
    };
  }
  return {
    mode: 'chat',
    label: 'Chat Consultation',
    icon: MessageSquare,
    badgeClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400',
    gradient: 'from-blue-500 to-indigo-600',
    borderAccent: 'border-l-blue-500',
    tagColor: 'text-blue-600',
  };
}

export default function UpcomingAppointmentsSection({
  appointments = [],
  onViewDetails,
  user,
}) {
  const today = getISTDateString();
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState('all'); // 'all' | 'video' | 'audio' | 'chat'
  const [selectedTimeframe, setSelectedTimeframe] = useState('all'); // 'all' | 'tomorrow' | 'week'

  // Filter only future confirmed/scheduled online appointments
  const upcomingList = useMemo(() => {
    return appointments.filter(a => {
      const s = (a.status || '').toLowerCase();
      // Must be future date and confirmed or scheduled
      const isFuture = (a.date || '') > today;
      const isConfirmed = s === 'confirmed' || s === 'scheduled';
      return isFuture && isConfirmed;
    }).sort((a, b) => {
      // Sort by date ascending, then time ascending
      if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
      const ta = parseTime(a.time);
      const tb = parseTime(b.time);
      if (ta.hour == null || tb.hour == null) return 0;
      return (ta.hour * 60 + (ta.minute || 0)) - (tb.hour * 60 + (tb.minute || 0));
    });
  }, [appointments, today]);

  // Mode counts
  const stats = useMemo(() => {
    let video = 0;
    let audio = 0;
    let chat = 0;
    upcomingList.forEach(a => {
      const { mode } = getModeDetails(a);
      if (mode === 'video') video++;
      else if (mode === 'audio') audio++;
      else chat++;
    });
    return { total: upcomingList.length, video, audio, chat };
  }, [upcomingList]);

  // Calculate 7-day cutoff
  const tomorrowStr = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const tom = new Date(y, m - 1, d + 1);
    return `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;
  }, [today]);

  const nextWeekStr = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const nw = new Date(y, m - 1, d + 7);
    return `${nw.getFullYear()}-${String(nw.getMonth() + 1).padStart(2, '0')}-${String(nw.getDate()).padStart(2, '0')}`;
  }, [today]);

  // Apply filters
  const filteredAppointments = useMemo(() => {
    return upcomingList.filter(a => {
      // Mode filter
      if (selectedMode !== 'all') {
        const { mode } = getModeDetails(a);
        if (mode !== selectedMode) return false;
      }

      // Timeframe filter
      if (selectedTimeframe === 'tomorrow' && a.date !== tomorrowStr) return false;
      if (selectedTimeframe === 'week' && a.date > nextWeekStr) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const pName = (a.patient || '').toLowerCase();
        const pPhone = (a.patientId?.phone || a.phone || '').toLowerCase();
        const sym = (a.symptoms || '').toLowerCase();
        const tok = (a.tokenNumber || '').toLowerCase();
        const dStr = (a.date || '').toLowerCase();
        if (!pName.includes(q) && !pPhone.includes(q) && !sym.includes(q) && !tok.includes(q) && !dStr.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [upcomingList, selectedMode, selectedTimeframe, search, tomorrowStr, nextWeekStr]);

  // Group filtered appointments by date for structured reading
  const groupedByDate = useMemo(() => {
    const groups = {};
    filteredAppointments.forEach(apt => {
      const dateKey = apt.date || 'Unknown';
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(apt);
    });
    return groups;
  }, [filteredAppointments]);

  return (
    <div className="space-y-6">
      {/* ── Stat Badges & Quick Highlights ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border/70 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">All Upcoming</p>
            <p className="text-xl font-bold text-foreground">{stats.total}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Video Calls</p>
            <p className="text-xl font-bold text-foreground">{stats.video}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Audio Calls</p>
            <p className="text-xl font-bold text-foreground">{stats.audio}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/70 p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Chat Sessions</p>
            <p className="text-xl font-bold text-foreground">{stats.chat}</p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar (Search + Mode Buttons + Timeframe) ── */}
      <div className="bg-card rounded-2xl border border-border/70 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patient, token, phone, symptoms..."
              className="pl-9 text-xs h-9 rounded-xl bg-muted/40 border-border/60"
            />
          </div>

          {/* Timeframe pill selector */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 text-xs w-full sm:w-auto justify-center">
            <button
              onClick={() => setSelectedTimeframe('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedTimeframe === 'all'
                  ? 'bg-card text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Upcoming
            </button>
            <button
              onClick={() => setSelectedTimeframe('tomorrow')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedTimeframe === 'tomorrow'
                  ? 'bg-card text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => setSelectedTimeframe('week')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                selectedTimeframe === 'week'
                  ? 'bg-card text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Next 7 Days
            </button>
          </div>
        </div>

        {/* Mode filter pills */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter by Mode:
          </span>
          <Button
            size="sm"
            variant={selectedMode === 'all' ? 'default' : 'outline'}
            className="h-7 text-xs rounded-lg px-3"
            onClick={() => setSelectedMode('all')}
          >
            All Modes ({stats.total})
          </Button>
          <Button
            size="sm"
            variant={selectedMode === 'video' ? 'default' : 'outline'}
            className={`h-7 text-xs rounded-lg px-3 gap-1.5 ${
              selectedMode === 'video' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-emerald-600 border-emerald-500/30'
            }`}
            onClick={() => setSelectedMode('video')}
          >
            <Video className="w-3 h-3" /> Video ({stats.video})
          </Button>
          <Button
            size="sm"
            variant={selectedMode === 'audio' ? 'default' : 'outline'}
            className={`h-7 text-xs rounded-lg px-3 gap-1.5 ${
              selectedMode === 'audio' ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'text-teal-600 border-teal-500/30'
            }`}
            onClick={() => setSelectedMode('audio')}
          >
            <Phone className="w-3 h-3" /> Voice ({stats.audio})
          </Button>
          <Button
            size="sm"
            variant={selectedMode === 'chat' ? 'default' : 'outline'}
            className={`h-7 text-xs rounded-lg px-3 gap-1.5 ${
              selectedMode === 'chat' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-blue-600 border-blue-500/30'
            }`}
            onClick={() => setSelectedMode('chat')}
          >
            <MessageSquare className="w-3 h-3" /> Chat ({stats.chat})
          </Button>
        </div>
      </div>

      {/* ── Appointments List ── */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border/80 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <CalendarClock className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-base mb-1">
            No Upcoming Online Consultations
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search || selectedMode !== 'all' || selectedTimeframe !== 'all'
              ? 'No scheduled consultations match your current filters. Try resetting the filters.'
              : 'When patients book and you confirm online consultation requests for future dates, they will appear here.'}
          </p>
          {(search || selectedMode !== 'all' || selectedTimeframe !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => { setSearch(''); setSelectedMode('all'); setSelectedTimeframe('all'); }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([dateStr, list]) => {
            const relText = getRelativeDays(dateStr, today);
            return (
              <div key={dateStr} className="space-y-3">
                {/* Date header banner */}
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-heading font-bold text-sm text-foreground">
                        {formatDisplayDate(dateStr) || dateStr}
                      </span>
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">
                        {relText}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {list.length} {list.length === 1 ? 'consultation' : 'consultations'}
                  </span>
                </div>

                {/* Cards for this date */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {list.map(apt => {
                    const modeDetails = getModeDetails(apt);
                    const ModeIcon = modeDetails.icon;
                    const patient = apt.patientId;
                    const age = patient?.dateOfBirth
                      ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / 31557600000)
                      : null;

                    return (
                      <div
                        key={apt._id}
                        className="group bg-card rounded-2xl border border-border/70 p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between"
                      >
                        {/* Top Time + Mode Banner */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted text-foreground text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span>{apt.time} {subSlotFor && `· ${subSlotFor(apt.time)}`}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold ${modeDetails.badgeClass}`}>
                              <ModeIcon className="w-3 h-3" />
                              {modeDetails.label}
                            </span>
                          </div>

                          {/* Patient Header */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 overflow-hidden border border-primary/20">
                              {patient?.avatar ? (
                                <img src={patient.avatar} alt={apt.patient} className="w-full h-full object-cover" />
                              ) : (
                                (apt.patient || '?').slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-heading font-bold text-sm text-foreground truncate">
                                {apt.patient}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                {age && <span>{age} yrs</span>}
                                {patient?.gender && <span>• {patient.gender}</span>}
                                {patient?.bloodGroup && (
                                  <span className="inline-flex items-center gap-0.5 text-red-500 font-medium">
                                    <Droplet className="w-2.5 h-2.5" /> {patient.bloodGroup}
                                  </span>
                                )}
                              </div>
                              {apt.tokenNumber && (
                                <span className="inline-block mt-1 px-2 py-0.2 rounded-md bg-muted text-muted-foreground text-[10px] font-semibold">
                                  Token #{apt.tokenNumber}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Phone / Contact */}
                          {(patient?.phone || apt.phone) && (
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground/70" />
                              {patient?.phone || apt.phone}
                            </p>
                          )}

                          {/* Symptoms */}
                          {apt.symptoms && (
                            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs mb-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                                Symptoms / Complaints
                              </p>
                              <p className="text-foreground line-clamp-2 leading-relaxed">
                                {apt.symptoms}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Card Bottom / Action */}
                        <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Confirmed
                            </span>
                            {apt.fees > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                · ₹{apt.fees} Paid
                              </span>
                            )}
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 rounded-lg hover:border-primary hover:text-primary"
                            onClick={() => onViewDetails && onViewDetails(apt)}
                          >
                            <Eye className="w-3 h-3" /> View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
