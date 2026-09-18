import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneOff, Mic, MicOff, Volume2, VolumeX, User,
  FileText, Activity, Save, ChevronLeft, CalendarDays, Plus, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDisplayDate, getISTDateString } from '@/lib/dateUtils';

export default function DoctorCallRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);
  
  // Call Controls State
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  // Tabs State (info | prescription | history)
  const [activeTab, setActiveTab] = useState('info');
  
  // Prescription State
  const [diagnosis, setDiagnosis] = useState('');
  const [chiefComplaints, setChiefComplaints] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '', instructions: '' }]);
  const [advice, setAdvice] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [savingPrescription, setSavingPrescription] = useState(false);

  // Fetch Appointment Details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        // Note: Replace with specific getAppointment if available in API
        const data = await api.getAppointments({ status: 'All', limit: 200 });
        const all = data?.appointments || data?.data || data || [];
        const apt = all.find(a => a._id === appointmentId);
        
        if (!apt) {
          toast.error('Appointment not found');
          navigate(-1);
          return;
        }
        setAppointment(apt);
        setPatient(apt.patientId || {});
        
        // Auto-fill from quick intake if present
        if (apt.preConsultationDetails) {
          setChiefComplaints(
            apt.preConsultationDetails.chiefComplaint === 'Other' 
            ? apt.preConsultationDetails.chiefComplaintOther 
            : apt.preConsultationDetails.chiefComplaint || ''
          );
        }
      } catch (err) {
        toast.error('Failed to load appointment details');
      } finally {
        setLoading(false);
      }
    };
    if (appointmentId) fetchDetails();
  }, [appointmentId, navigate]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleEndCall = async () => {
    toast.success('Call ended successfully');
    navigate(-1);
  };

  const handleSavePrescription = async () => {
    if (!diagnosis) return toast.error('Please enter a diagnosis');
    const validMeds = medications.filter(m => m.name.trim());
    
    setSavingPrescription(true);
    try {
      await api.createRecord({
        patient: appointment.patient,
        patientId: patient?._id || appointment.patientId,
        doctor: user?.name,
        diagnosis: diagnosis,
        prescription: validMeds.map(m => `${m.name} - ${m.dosage} - ${m.frequency} ${m.instructions ? '(' + m.instructions + ')' : ''}`).join('\n'),
        type: 'prescription',
        notes: `Chief Complaints: ${chiefComplaints}\nAdvice: ${advice}\nFollow-up: ${followUp}`,
        data: {
          patient: { 
            name: appointment.patient, 
            age: patient?.dateOfBirth ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / 31557600000) : '', 
            gender: patient?.gender, 
            phone: patient?.phone 
          },
          doctor: { name: user?.name, specialization: user?.specialization },
          chiefComplaints,
          diagnosis,
          medications: validMeds,
          advice,
          followUp,
          date: getISTDateString(),
        },
      });
      
      // Auto-complete appointment if we wrote a prescription during the call
      if (appointment.status !== 'Completed') {
        await api.updateAppointment(appointment._id, { status: 'Completed' });
      }
      
      toast.success('Prescription saved and sent to patient');
      handleEndCall();
    } catch (e) {
      toast.error('Failed to save prescription');
      console.error(e);
    } finally {
      setSavingPrescription(false);
    }
  };

  const updateMedication = (index, field, value) => {
    const meds = [...medications];
    meds[index][field] = value;
    setMedications(meds);
  };

  const removeMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col md:flex-row overflow-hidden">
      {/* ════════ LEFT PANEL: Active Call Stage ════════ */}
      <div className="flex-1 bg-zinc-950 flex flex-col relative text-white">
        {/* Top bar inside call */}
        <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5 mr-1" /> Leave quietly
          </Button>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm tracking-wider font-medium">{formatTime(callDuration)}</span>
          </div>
        </div>

        {/* Central Audio Visualization / Avatar */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-blue-500/10 opacity-30" />
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 flex flex-col items-center"
          >
            {/* Pulsing rings for audio */}
            <div className="relative flex items-center justify-center w-48 h-48">
              {!isMuted && (
                <>
                  <div className="absolute inset-0 rounded-full border border-primary/40 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-2 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
                </>
              )}
              
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-blue-600 p-1 shadow-2xl relative z-10">
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-4xl font-bold uppercase overflow-hidden border-4 border-zinc-950">
                  {patient?.avatar ? (
                    <img src={patient.avatar} alt={appointment?.patient} className="w-full h-full object-cover" />
                  ) : (
                    (appointment?.patient || '?').slice(0, 2)
                  )}
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mt-8">{appointment?.patient}</h2>
            <p className="text-zinc-400 mt-2 font-medium bg-white/5 px-4 py-1 rounded-full text-sm">
              Voice Consultation
            </p>
          </motion.div>
        </div>

        {/* Call Controls */}
        <div className="h-32 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-6 pb-6 px-6 z-10">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${isMuted ? 'bg-white/20 text-white' : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={handleEndCall}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/20"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          <button 
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${!isSpeakerOn ? 'bg-white/20 text-white' : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'}`}
          >
            {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* ════════ RIGHT PANEL: Clinical Tools ════════ */}
      <div className="w-full md:w-[480px] bg-card border-l border-border/40 flex flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-20">
        <div className="flex p-2 bg-muted/30 border-b border-border/40">
          <button 
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'info' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            Patient Info
          </button>
          <button 
            onClick={() => setActiveTab('prescription')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'prescription' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          >
            Write Prescription
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
          <AnimatePresence mode="wait">
            {activeTab === 'info' && (
              <motion.div 
                key="info"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                {/* Patient Context */}
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                    <User className="w-4 h-4 text-primary" /> Basic Details
                  </h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm bg-muted/20 p-4 rounded-xl border border-border/40">
                    <div><p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Age</p><p className="font-medium text-foreground">{patient?.dateOfBirth ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / 31557600000) + ' yrs' : 'N/A'}</p></div>
                    <div><p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Gender</p><p className="font-medium text-foreground">{patient?.gender || 'N/A'}</p></div>
                    <div><p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Blood Group</p><p className="font-medium text-foreground">{patient?.bloodGroup || 'N/A'}</p></div>
                    <div><p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Phone</p><p className="font-medium text-foreground">{patient?.phone || 'N/A'}</p></div>
                  </div>
                </div>

                {/* Quick Intake details */}
                {appointment?.preConsultationDetails && (
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                      <FileText className="w-4 h-4 text-primary" /> Pre-Consultation Intake
                    </h3>
                    <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/40">
                      <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Chief Complaint</span>
                        <span className="text-sm font-medium">
                          {appointment.preConsultationDetails.chiefComplaint === 'Other' ? appointment.preConsultationDetails.chiefComplaintOther : appointment.preConsultationDetails.chiefComplaint}
                          {appointment.preConsultationDetails.symptomsDuration && ` (${appointment.preConsultationDetails.symptomsDuration})`}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1 border-b border-border/40 pb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Past Medical History</span>
                        <span className="text-sm">
                          {appointment.preConsultationDetails.pastMedicalHistory?.hasHistory === false ? 'None' : (appointment.preConsultationDetails.pastMedicalHistory?.details || 'Yes')}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Allergies</span>
                        <span className={`text-sm ${appointment.preConsultationDetails.allergies?.hasAllergies ? 'text-destructive font-medium' : ''}`}>
                          {appointment.preConsultationDetails.allergies?.hasAllergies === false ? 'None' : (appointment.preConsultationDetails.allergies?.details || 'Yes')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Appointment Info */}
                <div>
                   <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
                    <CalendarDays className="w-4 h-4 text-primary" /> Appointment Info
                  </h3>
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/40 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{formatDisplayDate(appointment?.date)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Time</span><span className="font-medium">{appointment?.time}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium text-success">{appointment?.status}</span></div>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'prescription' && (
              <motion.div 
                key="prescription"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                <div>
                  <Label className="text-xs font-bold text-foreground">Chief Complaints</Label>
                  <Input 
                    placeholder="E.g. Fever, Cough" 
                    value={chiefComplaints} 
                    onChange={e => setChiefComplaints(e.target.value)} 
                    className="mt-1.5 text-sm"
                  />
                </div>
                
                <div>
                  <Label className="text-xs font-bold text-foreground">Diagnosis *</Label>
                  <Input 
                    placeholder="E.g. Viral Pharyngitis" 
                    value={diagnosis} 
                    onChange={e => setDiagnosis(e.target.value)} 
                    className="mt-1.5 text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-bold text-foreground">Medications</Label>
                    <Button type="button" size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={() => setMedications([...medications, { name: '', dosage: '', frequency: '', instructions: '' }])}>
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {medications.map((med, i) => (
                      <div key={i} className="bg-muted/20 p-3 rounded-xl border border-border/60 relative">
                        {medications.length > 1 && (
                          <button onClick={() => removeMedication(i)} className="absolute -top-2 -right-2 text-destructive bg-background rounded-full hover:scale-110 transition-transform">
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        <Input placeholder="Medicine Name" value={med.name} onChange={e => updateMedication(i, 'name', e.target.value)} className="mb-2 text-sm h-8" />
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <Input placeholder="Dosage (e.g. 500mg)" value={med.dosage} onChange={e => updateMedication(i, 'dosage', e.target.value)} className="text-sm h-8" />
                          <Input placeholder="Freq (e.g. 1-0-1)" value={med.frequency} onChange={e => updateMedication(i, 'frequency', e.target.value)} className="text-sm h-8" />
                        </div>
                        <Input placeholder="Instructions (e.g. After meals)" value={med.instructions} onChange={e => updateMedication(i, 'instructions', e.target.value)} className="text-sm h-8" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-foreground">Advice / Instructions</Label>
                  <Input 
                    placeholder="Drink plenty of fluids..." 
                    value={advice} 
                    onChange={e => setAdvice(e.target.value)} 
                    className="mt-1.5 text-sm"
                  />
                </div>
                
                <div>
                  <Label className="text-xs font-bold text-foreground">Follow-up</Label>
                  <Input 
                    placeholder="e.g. After 5 days" 
                    value={followUp} 
                    onChange={e => setFollowUp(e.target.value)} 
                    className="mt-1.5 text-sm"
                  />
                </div>
                
                <div className="pt-4 border-t border-border/40">
                  <Button 
                    className="w-full gap-2 font-bold" 
                    onClick={handleSavePrescription}
                    disabled={savingPrescription}
                  >
                    {savingPrescription ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Complete Call & Save Prescription
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-2">
                    This will mark the appointment as Completed.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
