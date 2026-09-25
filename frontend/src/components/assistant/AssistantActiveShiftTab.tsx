import React from 'react';
import {
  Clock,
  Phone,
  MessageSquare,
  Building2,
  Navigation,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TaskChecklistView } from '@/components/assistant/TaskChecklistView';
import { AssistantChatPanel } from '@/components/assistant/AssistantChatPanel';

interface AssistantActiveShiftTabProps {
  activeBooking: any;
  user: any;
  elapsedDuration: string;
  incomingRequestsCount: number;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  setShowCompleteModal: (show: boolean) => void;
  setActiveTab: (tab: string) => void;
  getAssistantNet: (booking: any) => number;
  handleCheckIn: () => Promise<void>;
  handleToggleTask: (taskId: string, isDone: boolean) => Promise<void>;
  handleAddCustomTask: (label: string, category: string) => Promise<void>;
}

export const AssistantActiveShiftTab: React.FC<AssistantActiveShiftTabProps> = ({
  activeBooking,
  user,
  elapsedDuration,
  incomingRequestsCount,
  showChat,
  setShowChat,
  setShowCompleteModal,
  setActiveTab,
  getAssistantNet,
  handleCheckIn,
  handleToggleTask,
  handleAddCustomTask,
}) => {
  if (!activeBooking) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
          No Confirmed or Active Shift Right Now
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          When you accept a shift request, patient details, emergency contacts, hospital location, and realtime task checklist will appear here.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button
            type="button"
            onClick={() => setActiveTab('requests')}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl h-10 px-5"
          >
            Check Shift Requests ({incomingRequestsCount})
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-6">
      {/* Top Status & Shift Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
            <Badge className="bg-teal-700 text-white text-[11px] font-black uppercase tracking-wider">
              {activeBooking.status.replace('_', ' ')}
            </Badge>
            <span className="text-xs font-mono text-slate-400">
              #{activeBooking.bookingNumber || activeBooking._id.slice(-6)}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Assisting {activeBooking.patientId?.name || 'Patient'}
          </h2>
          <p className="text-xs text-slate-500">
            Scheduled: {new Date(activeBooking.scheduledDate).toLocaleDateString()} at {activeBooking.startTime} ({activeBooking.durationType?.toUpperCase()})
          </p>
        </div>

        {/* Stopwatch and Quick Communication buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {activeBooking.status === 'in_progress' && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 px-4 py-2 rounded-2xl flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 animate-spin" />
              <div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold block">
                  Duty Timer Elapsed
                </span>
                <span className="font-mono font-black text-base text-emerald-700 dark:text-emerald-300">
                  {elapsedDuration}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {activeBooking.patientId?.phone && (
              <a href={`tel:${activeBooking.patientId.phone}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold gap-1.5 h-10 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-teal-50 dark:hover:bg-slate-800"
                >
                  <Phone className="w-3.5 h-3.5 text-teal-600" /> Call Patient
                </Button>
              </a>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => setShowChat(!showChat)}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold gap-1.5 h-10 px-4 rounded-xl shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {showChat ? 'Close Chat' : 'In-App Chat'}
            </Button>
          </div>
        </div>
      </div>

      {/* Patient, Location, and Instructions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Patient Contact</span>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            {activeBooking.patientId?.name || 'Patient'}
          </h4>
          <p className="text-xs text-slate-500">
            Phone: {activeBooking.patientId?.phone || activeBooking.phone || 'Provided via app'}
          </p>
          {activeBooking.onBehalfOf && activeBooking.onBehalfOf !== 'self' && (
            <Badge variant="outline" className="text-[10px] font-bold">
              Booked for: {activeBooking.onBehalfOf?.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Hospital & Navigation Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Hospital Location</span>
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600" />
            {activeBooking.hospital}
          </h4>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeBooking.hospital)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:underline pt-1"
          >
            <Navigation className="w-3.5 h-3.5 text-teal-600" />
            Open Google Maps Navigation
          </a>
        </div>

        {/* Shift Compensation Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Shift Earnings</span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{getAssistantNet(activeBooking)}
          </div>
          <p className="text-[11px] text-slate-500">
            Rate: ₹{activeBooking.cost?.ratePerHour || 150}/hr • Auto credited upon shift completion
          </p>
        </div>
      </div>

      {/* Patient Special Instructions */}
      {activeBooking.specialInstructions && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
          <span className="font-bold block mb-0.5">Special Instructions / Tasks Given:</span>
          <p className="italic">"{activeBooking.specialInstructions}"</p>
        </div>
      )}

      {/* Check In Action if Confirmed */}
      {activeBooking.status === 'confirmed' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border-2 border-teal-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-600" />
              Arrived at Hospital Campus?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tap "Check In Now" as soon as you enter the hospital. This starts your duty duration and notifies the patient.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleCheckIn}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-10 px-6 rounded-xl shadow-md shadow-emerald-600/20"
          >
            Check In Now
          </Button>
        </div>
      )}

      {/* Task Checklist Component */}
      <div className="space-y-2">
        <TaskChecklistView
          tasks={activeBooking.taskChecklist || []}
          isAssistant={true}
          onToggleTask={handleToggleTask}
          onAddCustomTask={handleAddCustomTask}
        />
      </div>

      {/* Complete Assistance Shift Action */}
      {activeBooking.status === 'in_progress' && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Finished all hospital errands, paperwork, and patient handover?
          </p>
          <Button
            type="button"
            onClick={() => setShowCompleteModal(true)}
            className="bg-teal-700 hover:bg-teal-800 text-white font-black text-xs px-8 h-11 rounded-2xl shadow-lg shadow-teal-700/20"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark Assistance Completed
          </Button>
        </div>
      )}

      {/* Slide/Collapsible In-app Chat Panel */}
      {showChat && (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <AssistantChatPanel
            bookingId={activeBooking._id}
            currentUser={user}
            targetUser={activeBooking.patientId}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}
    </div>
  );
};
