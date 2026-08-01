import React, { useState } from 'react';
import { CalendarDays, Clock, Phone, Mail, MapPin, Droplet, FileText, History, PenTool, CheckCircle, ArrowLeft, Check, ChevronDown, ChevronUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDisplayDate } from '@/lib/dateUtils';
import { ordinal, statusColors } from '@/components/AppointmentCard';

export default function SelectedPatientDetails({ 
  appointments,
  activeApt,
  setActiveApt,
  visitNumber, 
  pastVisitCount, 
  lastVisit, 
  onViewHistory, 
  onWritePrescription,
  onComplete,
}) {
  const [showCompleteFlow, setShowCompleteFlow] = useState(false);
  const [quickNotes, setQuickNotes] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Reset when activeApt changes
  React.useEffect(() => {
    setShowCompleteFlow(false);
    setQuickNotes('');
    setShowDetails(false);
  }, [activeApt?._id]);

  if (!activeApt) {
    return (
      <div className="bg-card rounded-[24px] border border-border/60 p-8 shadow-sm flex flex-col items-center justify-center h-full text-center gap-4 text-muted-foreground/60">
        <User className="w-16 h-16" />
        <p>Select a time slot above<br/>to view patient details.</p>
      </div>
    );
  }

  const apt = activeApt;
  const patient = apt.patientId || {};
  const isReturning = pastVisitCount > 0;
  const badgeText = isReturning ? `${ordinal(visitNumber)} Visit` : '1st Visit';
  const badgeColor = isReturning ? 'bg-purple-500/10 text-purple-600 border border-purple-200' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-200';
  const initials = (apt.patient || 'Unknown').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handleConfirmComplete = () => {
    onComplete(apt, quickNotes);
  };

  return (
    <div className="bg-card rounded-[24px] border border-border/60 p-6 shadow-sm flex flex-col flex-1 overflow-hidden relative">
      
      {/* Patient Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Picture / Initials */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-primary flex items-center justify-center font-bold text-2xl shrink-0 shadow-sm ring-2 ring-primary/10">
            {patient.profilePicture ? (
              <img src={patient.profilePicture} alt={apt.patient} className="w-full h-full rounded-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{apt.patient || 'Unknown'}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {patient.gender && <span>{patient.gender}</span>}
              {patient.gender && patient.age && <span>•</span>}
              {patient.age && <span>{patient.age} yrs</span>}
              {apt.uhid && <span>•</span>}
              {apt.uhid && <span>UHID: {apt.uhid}</span>}
            </div>
            {/* Appointment Time & Status */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3" /> {apt.time || '—'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[apt.status] || statusColors.Pending}`}>
                {apt.status}
              </span>
            </div>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${badgeColor}`}>
          {badgeText}
        </div>
      </div>

      {/* Patient Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {patient.phone && (
          <div className="flex items-center gap-2 text-sm bg-muted/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Phone</p>
              <span className="text-foreground font-medium text-sm truncate block">{patient.phone}</span>
            </div>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-2 text-sm bg-muted/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Email</p>
              <span className="text-foreground font-medium text-sm truncate block">{patient.email}</span>
            </div>
          </div>
        )}
        {patient.address && (
          <div className="flex items-center gap-2 text-sm bg-muted/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Address</p>
              <span className="text-foreground font-medium text-sm truncate block">{patient.address}</span>
            </div>
          </div>
        )}
        {patient.blood_group && (
          <div className="flex items-center gap-2 text-sm bg-muted/20 rounded-xl p-3">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Droplet className="w-4 h-4 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium">Blood Group</p>
              <span className="text-foreground font-medium text-sm">{patient.blood_group}</span>
            </div>
          </div>
        )}
      </div>

      {/* Last Visit Preview (returning patients only) */}
      {isReturning && lastVisit && (
        <div className="mb-4 bg-primary/5 border border-primary/15 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary flex items-center gap-1">
              <History className="w-3 h-3" /> Last Visit
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDisplayDate(lastVisit.date) || lastVisit.date}
            </span>
          </div>
          {lastVisit.diagnosis && (
            <p className="text-xs text-foreground font-medium line-clamp-1">
              {lastVisit.diagnosis}
            </p>
          )}
          {lastVisit.note && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {lastVisit.note}
            </p>
          )}
        </div>
      )}

      {/* Main Action Area */}
      <div className="mt-auto pt-4 border-t border-border/40">
        
        {showCompleteFlow ? (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div>
              <h4 className="text-base font-bold text-foreground">Remember Your Patient's Next Appointment</h4>
              <p className="text-sm text-muted-foreground mt-1">Add quick notes here so you don't forget important details about your patient's upcoming visit.</p>
            </div>
            <Textarea 
              placeholder="Type your quick notes here..."
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              className="resize-none h-20"
            />
            <div className="flex items-center gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCompleteFlow(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button className="flex-1 bg-success hover:bg-success/90 text-white" onClick={handleConfirmComplete}>
                <Check className="w-4 h-4 mr-2" /> Confirm
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* 4 Action Buttons in 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="w-full bg-muted/30 hover:bg-muted/50 h-10"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
                View Details
              </Button>
              <Button 
                variant="outline" 
                disabled={!isReturning}
                className="w-full bg-muted/30 text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-10" 
                onClick={() => onViewHistory(apt)}
              >
                <History className="w-4 h-4 mr-2" /> Previous Appointment
              </Button>
              <Button 
                variant="outline" 
                className="w-full bg-muted/30 text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-10" 
                onClick={() => onWritePrescription(apt)}
              >
                <PenTool className="w-4 h-4 mr-2" /> Write Prescription
              </Button>
              <Button 
                className="w-full h-10 bg-success hover:bg-success/90 text-white" 
                onClick={() => setShowCompleteFlow(true)}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Complete
              </Button>
            </div>

            {/* View Details Dropdown - Intake Form Details */}
            {showDetails && (
              <div className="mt-1 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500 font-semibold mb-3">
                  <FileText className="w-4 h-4" /> Patient Intake Details
                </div>
                
                {/* Chief Complaint */}
                {apt.chiefComplaints && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Chief Complaint</p>
                    <p className="text-sm text-foreground font-medium bg-amber-500/5 rounded-lg p-2 border border-amber-500/10">
                      {apt.chiefComplaints}
                    </p>
                  </div>
                )}

                {/* Pre-consultation details if available */}
                {apt.preConsultationDetails?.filledAt && (
                  <div className="space-y-3">
                    {apt.preConsultationDetails.chiefComplaint && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Main Symptom</p>
                        <p className="text-sm text-foreground">{apt.preConsultationDetails.chiefComplaint}</p>
                      </div>
                    )}
                    {apt.preConsultationDetails.symptomsDuration && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Duration</p>
                        <p className="text-sm text-foreground">{apt.preConsultationDetails.symptomsDuration}</p>
                      </div>
                    )}
                    {apt.preConsultationDetails.allergies?.hasAllergies && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Allergies</p>
                        <p className="text-sm text-destructive font-medium">{apt.preConsultationDetails.allergies.details}</p>
                      </div>
                    )}
                    {apt.preConsultationDetails.currentMedications?.hasMedications && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Current Medications</p>
                        <p className="text-sm text-foreground">{apt.preConsultationDetails.currentMedications.details}</p>
                      </div>
                    )}
                    {apt.preConsultationDetails.familyHistory?.hasHistory && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Family History</p>
                        <p className="text-sm text-foreground">{apt.preConsultationDetails.familyHistory.details}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Symptoms fallback */}
                {apt.symptoms && !apt.chiefComplaints && !apt.preConsultationDetails?.filledAt && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Symptoms</p>
                    <p className="text-sm text-foreground">{apt.symptoms}</p>
                  </div>
                )}

                {!apt.chiefComplaints && !apt.symptoms && !apt.preConsultationDetails?.filledAt && (
                  <p className="text-muted-foreground italic text-sm">No intake details provided by patient.</p>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}