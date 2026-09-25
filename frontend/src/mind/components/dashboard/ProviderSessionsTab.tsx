import React from "react";
import { Search, CalendarCheck, ClipboardList, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mind/components/ui/card";
import { Input } from "@/mind/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/mind/components/ui/select";
import { UpcomingAppointmentCard, EmptyState, RequestRow, SessionCard } from "@/mind/components/ProviderDashboardComponents";

export function ProviderSessionsTab({
  toolkitContent,
  upcomingAppointments,
  getPackageBadgeLabel,
  sessionDrafts,
  updateDraft,
  rescheduleAppointment,
  createMeet,
  setActiveChatPeer,
  setActiveChatPeerName,
  setSearchParams,
  pending,
  updateAppointment,
  sessionSearch,
  setSessionSearch,
  sessionTypeFilter,
  setSessionTypeFilter,
  sessionFilter,
  setSessionFilter,
  filteredSessions,
  notes,
}) {
  return (
    <div className="space-y-6">
      {toolkitContent}

      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Upcoming Appointments
          </CardTitle>
          <CardDescription>User name, session type, date/time, mode, status, and rescheduling controls.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-2">
          {upcomingAppointments.length ? (
            upcomingAppointments.map((appointment) => (
              <UpcomingAppointmentCard
                key={appointment.id}
                appointment={appointment}
                packageBadge={getPackageBadgeLabel(appointment)}
                draft={sessionDrafts[appointment.id] || {}}
                onDraft={(key, value) => updateDraft(appointment.id, key, value)}
                onReschedule={() => rescheduleAppointment(appointment)}
                onMeet={() => createMeet(appointment.id, sessionDrafts[appointment.id]?.meetingLink || "")}
                onChat={(peerId, name) => {
                  setActiveChatPeer(String(peerId));
                  setActiveChatPeerName(name || appointment.studentName || "");
                  setSearchParams({ tab: "sessions" });
                }}
              />
            ))
          ) : (
            <EmptyState icon={CalendarCheck} title="No upcoming appointments" text="Confirmed and pending bookings appear here." />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Booking Requests
              </CardTitle>
              <CardDescription>Accept or reject requests. Add Meet for video, Chat for chat modes. Reschedule from Session Schedule below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length ? (
                pending.map((appointment) => (
                  <RequestRow
                    key={appointment.id}
                    appointment={appointment}
                    onConfirm={() => updateAppointment(appointment.id, { status: "confirmed" }, "Request accepted")}
                    onDecline={() => updateAppointment(appointment.id, { status: "declined" }, "Request declined")}
                    onMeet={() => createMeet(appointment.id)}
                    onChat={(peerId, name) => {
                      setActiveChatPeer(String(peerId));
                      setActiveChatPeerName(name || appointment.studentName || "");
                    }}
                  />
                ))
              ) : (
                <EmptyState icon={ClipboardCheck} title="No pending requests" text="New booking requests will appear here." />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-secondary" />
                  Session Schedule
                </CardTitle>
                <CardDescription>Manage confirmed, pending, completed, and cancelled sessions.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
                  <Input className="pl-9" value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="Search sessions" />
                </div>
                <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="package">Package Only</SelectItem>
                    <SelectItem value="onetime">One-Time</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sessionFilter} onValueChange={setSessionFilter}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredSessions.length ? (
              filteredSessions.map((appointment) => (
                <SessionCard
                  key={appointment.id}
                  appointment={appointment}
                  packageBadge={getPackageBadgeLabel(appointment)}
                  draft={sessionDrafts[appointment.id] || {}}
                  onDraft={(key, value) => updateDraft(appointment.id, key, value)}
                  onReschedule={() => rescheduleAppointment(appointment)}
                  onComplete={() =>
                    updateAppointment(
                      appointment.id,
                      { status: "completed", notes: notes[appointment.id] || appointment.notes || "" },
                      "Session completed"
                    )
                  }
                  onCancel={() => updateAppointment(appointment.id, { status: "cancelled" }, "Session cancelled")}
                  onMeet={() => createMeet(appointment.id, sessionDrafts[appointment.id]?.meetingLink || "")}
                  onChat={(peerId, name) => {
                    setActiveChatPeer(String(peerId));
                    setActiveChatPeerName(name || appointment.studentName || "");
                  }}
                />
              ))
            ) : (
              <EmptyState icon={CalendarCheck} title="No sessions found" text="Try another status or search term." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
