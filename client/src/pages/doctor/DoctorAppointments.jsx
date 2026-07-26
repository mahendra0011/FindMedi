import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, FileText, IndianRupee, Send, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const statusColors = { Confirmed: 'bg-success/10 text-success', Cancelled: 'bg-destructive/10 text-destructive', Completed: 'bg-info/10 text-info' };
const filters = ['All', 'Confirmed', 'Cancelled', 'Completed'];
const billServices = {
  'Consultation': 500,
  'Follow-up': 300,
  'Check-up': 400,
  'Emergency': 800,
};

const initialPrescriptionData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  chiefComplaints: '', diagnosis: '',
  medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
  advice: '', followUp: '',
};

const initialLabReportData = {
  patientName: '', age: '', gender: '', phone: '', email: '',
  doctorName: '', specialization: '',
  reportId: '', testDate: '', reportDate: '',
  tests: [{ name: '', result: '', unit: '', referenceRange: '' }],
  notes: '',
};

const initialDischargeData = {
  patientName: '', age: '', gender: '', phone: '', email: '', address: '',
  doctorName: '', specialization: '',
  admissionId: '', admissionDate: '', dischargeDate: '',
  chiefComplaints: '', diagnosis: '',
  treatmentGiven: '', surgery: '',
  medications: [{ name: '', dosage: '', frequency: '' }],
  dischargeAdvice: '', followUpInstructions: '',
};

export default function DoctorAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [completeId, setCompleteId] = useState(null);
  const [reportType, setReportType] = useState('Prescription');
  const [billModal, setBillModal] = useState(null);
  const [billAmount, setBillAmount] = useState(500);
  
  const [prescriptionData, setPrescriptionData] = useState(initialPrescriptionData);
  const [labReportData, setLabReportData] = useState(initialLabReportData);
  const [dischargeData, setDischargeData] = useState(initialDischargeData);
  const [showReportModal, setShowReportModal] = useState(false);

  const timeSlots = ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'];

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getAppointments({ doctor: user?.name, status: filter });
      const docName = user?.name?.toLowerCase();
      setAppointments((data || []).filter(apt => apt.doctor?.toLowerCase() === docName));
    } catch (e) { console.error(e); toast.error('Failed to load appointments'); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAppointments(); }, [filter, user?.name]);

  const handleStatus = async (id, status) => {
    try { await api.updateAppointment(id, { status }); loadAppointments(); } catch (e) { console.error(e); toast.error('Failed to update appointment'); }
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime || !rescheduleId) return;
    try {
      await api.updateAppointment(rescheduleId, { date: newDate, time: newTime, status: 'Confirmed' });
      toast.success('Appointment rescheduled');
      setRescheduleId(null); setNewDate(''); setNewTime('');
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to reschedule appointment'); }
  };

  const handleComplete = (apt) => {
    setCompleteId(apt._id);
    setBillAmount(user?.consultationFee || billServices[apt.type] || 500);
    setPrescriptionData({ ...initialPrescriptionData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '' });
    setLabReportData({ ...initialLabReportData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '', testDate: new Date().toISOString().split('T')[0], reportDate: new Date().toISOString().split('T')[0] });
    setDischargeData({ ...initialDischargeData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '', admissionDate: new Date().toISOString().split('T')[0], dischargeDate: new Date().toISOString().split('T')[0] });
  };

  const openReportModal = (apt, type) => {
    setCompleteId(apt._id);
    setReportType(type);
    if (type === 'Prescription') {
      setPrescriptionData({ ...initialPrescriptionData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '' });
    } else if (type === 'Lab Report') {
      setLabReportData({ ...initialLabReportData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '', testDate: new Date().toISOString().split('T')[0], reportDate: new Date().toISOString().split('T')[0], reportId: `LAB-${Date.now()}` });
    } else {
      setDischargeData({ ...initialDischargeData, patientName: apt.patient, doctorName: user?.name, specialization: user?.specialization || '', admissionDate: apt.date || new Date().toISOString().split('T')[0], dischargeDate: new Date().toISOString().split('T')[0] });
    }
    setShowReportModal(true);
  };

  const addMedication = (type) => {
    if (type === 'Prescription') {
      setPrescriptionData({ ...prescriptionData, medications: [...prescriptionData.medications, { name: '', dosage: '', frequency: '', instructions: '' }] });
    } else {
      setDischargeData({ ...dischargeData, medications: [...dischargeData.medications, { name: '', dosage: '', frequency: '' }] });
    }
  };

  const removeMedication = (type, index) => {
    if (type === 'Prescription') {
      setPrescriptionData({ ...prescriptionData, medications: prescriptionData.medications.filter((_, i) => i !== index) });
    } else {
      setDischargeData({ ...dischargeData, medications: dischargeData.medications.filter((_, i) => i !== index) });
    }
  };

  const updateMedication = (type, index, field, value) => {
    if (type === 'Prescription') {
      const meds = [...prescriptionData.medications];
      meds[index][field] = value;
      setPrescriptionData({ ...prescriptionData, medications: meds });
    } else {
      const meds = [...dischargeData.medications];
      meds[index][field] = value;
      setDischargeData({ ...dischargeData, medications: meds });
    }
  };

  const addTest = () => {
    setLabReportData({ ...labReportData, tests: [...labReportData.tests, { name: '', result: '', unit: '', referenceRange: '' }] });
  };

  const removeTest = (index) => {
    setLabReportData({ ...labReportData, tests: labReportData.tests.filter((_, i) => i !== index) });
  };

  const updateTest = (index, field, value) => {
    const tests = [...labReportData.tests];
    tests[index][field] = value;
    setLabReportData({ ...labReportData, tests });
  };

  const handleGeneratePrescription = async () => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!prescriptionData.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      const meds = prescriptionData.medications.filter(m => m.name.trim());
      await api.createRecord({
        patient: prescriptionData.patientName,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: prescriptionData.doctorName,
        diagnosis: prescriptionData.diagnosis,
        prescription: prescriptionData.medications.map(m => `${m.name} - ${m.dosage} - ${m.frequency} ${m.instructions ? `(${m.instructions})` : ''}`).join('\n'),
        type: 'prescription',
        notes: `Chief Complaints: ${prescriptionData.chiefComplaints}\nAdvice: ${prescriptionData.advice}\nFollow-up: ${prescriptionData.followUp}`,
        data: {
          patient: { name: prescriptionData.patientName, age: prescriptionData.age, gender: prescriptionData.gender, phone: prescriptionData.phone, email: prescriptionData.email, address: prescriptionData.address },
          doctor: { name: prescriptionData.doctorName, specialization: prescriptionData.specialization },
          chiefComplaints: prescriptionData.chiefComplaints,
          diagnosis: prescriptionData.diagnosis,
          medications: meds,
          advice: prescriptionData.advice,
          followUp: prescriptionData.followUp,
          date: new Date().toISOString().split('T')[0],
        },
      });
      await api.createNotification({ title: 'New Prescription', message: `Dr. ${user?.name} has generated your prescription`, type: 'records', userId: apt.patientId || apt.patient });
      toast.success('Prescription generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate prescription'); }
  };

  const handleGenerateLabReport = async () => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!labReportData.reportId) return toast.error('Please enter a Report ID');
    try {
      const tests = labReportData.tests.filter(t => t.name.trim());
      await api.createRecord({
        patient: labReportData.patientName,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: labReportData.doctorName,
        diagnosis: 'Lab Report',
        prescription: '',
        type: 'lab_report',
        notes: labReportData.notes,
        data: {
          patient: { name: labReportData.patientName, age: labReportData.age, gender: labReportData.gender, phone: labReportData.phone, email: labReportData.email },
          doctor: { name: labReportData.doctorName, specialization: labReportData.specialization },
          reportId: labReportData.reportId,
          testDate: labReportData.testDate,
          reportDate: labReportData.reportDate,
          tests: tests,
          notes: labReportData.notes,
          date: labReportData.reportDate,
        },
      });
      await api.createNotification({ title: 'Lab Report Ready', message: `Dr. ${user?.name} has generated your lab report`, type: 'records', userId: apt.patientId || apt.patient });
      toast.success('Lab report generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate lab report'); }
  };

  const handleGenerateDischargeSummary = async () => {
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!dischargeData.diagnosis) return toast.error('Please enter a diagnosis');
    try {
      const meds = dischargeData.medications.filter(m => m.name.trim());
      await api.createRecord({
        patient: dischargeData.patientName,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: dischargeData.doctorName,
        diagnosis: dischargeData.diagnosis,
        prescription: dischargeData.medications.map(m => `${m.name} - ${m.dosage} - ${m.frequency}`).join('\n'),
        type: 'discharge_summary',
        notes: `Chief Complaints: ${dischargeData.chiefComplaints}\nTreatment: ${dischargeData.treatmentGiven}\nSurgery: ${dischargeData.surgery}\nDischarge Advice: ${dischargeData.dischargeAdvice}\nFollow-up: ${dischargeData.followUpInstructions}`,
        data: {
          patient: { name: dischargeData.patientName, age: dischargeData.age, gender: dischargeData.gender, phone: dischargeData.phone, email: dischargeData.email, address: dischargeData.address },
          doctor: { name: dischargeData.doctorName, specialization: dischargeData.specialization },
          admissionId: dischargeData.admissionId,
          admissionDate: dischargeData.admissionDate,
          dischargeDate: dischargeData.dischargeDate,
          chiefComplaints: dischargeData.chiefComplaints,
          diagnosis: dischargeData.diagnosis,
          treatment: dischargeData.treatmentGiven,
          surgery: dischargeData.surgery,
          medications: meds,
          dischargeAdvice: dischargeData.dischargeAdvice,
          followUpInstructions: dischargeData.followUpInstructions,
          date: dischargeData.dischargeDate,
        },
      });
      await api.createNotification({ title: 'Discharge Summary', message: `Dr. ${user?.name} has generated your discharge summary`, type: 'records', userId: apt.patientId || apt.patient });
      toast.success('Discharge summary generated');
      setShowReportModal(false);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate discharge summary'); }
  };

  const handleGenerateBill = async () => {
    if (!completeId) return toast.error('No appointment selected');
    const apt = appointments.find(a => a._id === completeId);
    if (!apt) return toast.error('Appointment not found');
    if (!billAmount) return toast.error('Please enter a bill amount');
    try {
      await api.createBill({
        patient: apt.patient,
        patientId: apt.patientId?._id || apt.patientId,
        doctor: user?.name,
        service: `${apt.type} - ${apt.department}`,
        amount: billAmount,
        date: new Date().toISOString().split('T')[0],
        status: 'Confirmed',
      });
      await api.createNotification({
        title: 'New Invoice',
        message: `New invoice of ₹${billAmount} generated for ${apt.type} - ${apt.department}`,
        type: 'payment',
        userId: apt.patientId || apt.patient,
      });
      await api.updateAppointment(completeId, { status: 'Completed' });
      toast.success('Bill generated');
      setBillModal(null);
      setCompleteId(null);
      loadAppointments();
    } catch (e) { console.error(e); toast.error('Failed to generate bill'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Appointments</h1>
          <p className="text-muted-foreground">Manage your patient appointments</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No appointments found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt, i) => (
            <motion.div key={apt._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{apt.patient}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[apt.status]}`}>{apt.status}</span>
              </div>
              <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5" /><span>{apt.date}</span></div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span>{apt.time}</span></div>
              </div>
              {apt.notes && <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 mb-3">Notes: {apt.notes}</p>}
              <div className="flex gap-2">
                {apt.status === 'Confirmed' && (
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-destructive hover:text-destructive" onClick={() => { if (confirm('Cancel this appointment?')) handleStatus(apt._id, 'Cancelled'); }}>
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </Button>
                )}
                {apt.status === 'Confirmed' && (
                  <>
                    <Button size="sm" className="flex-1 gap-1" onClick={() => handleComplete(apt)}>
                      <CheckCircle className="w-3.5 h-3.5" /> Complete
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setRescheduleId(apt._id)}>
                      <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                    </Button>
                  </>
                )}
                {apt.status === 'Completed' && (
                  <div className="flex gap-2 w-full">
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openReportModal(apt, 'Prescription')}>
                      <FileText className="w-3.5 h-3.5" /> Prescription
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openReportModal(apt, 'Lab Report')}>
                      <FileText className="w-3.5 h-3.5" /> Lab Report
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openReportModal(apt, 'Discharge Summary')}>
                      <FileText className="w-3.5 h-3.5" /> Discharge
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => { setCompleteId(apt._id); setBillModal(true); }}>
                      <IndianRupee className="w-3.5 h-3.5" /> Bill
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setRescheduleId(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Reschedule Appointment</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Date</label>
                <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">New Time</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {timeSlots.map(t => (
                    <button key={t} onClick={() => setNewTime(t)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${newTime === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 bg-warning/10 p-2 rounded-lg">
              <AlertCircle className="w-3 h-3 inline mr-1" /> All slots shown may not reflect real-time availability. The system will confirm after checking schedule conflicts.
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setRescheduleId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleReschedule} disabled={!newDate || !newTime}>Confirm</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Complete Session Modal - Show Report and Bill options */}
      {completeId && !showReportModal && !billModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setCompleteId(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Complete Session</h3>
            <p className="text-sm text-muted-foreground mb-6">Generate a report and bill for this patient session</p>
            <div className="space-y-3">
              <Button className="w-full gap-2" onClick={() => openReportModal(appointments.find(a => a._id === completeId), 'Prescription')}>
                <FileText className="w-4 h-4" /> Generate Prescription
              </Button>
              <Button className="w-full gap-2" onClick={() => openReportModal(appointments.find(a => a._id === completeId), 'Lab Report')}>
                <FileText className="w-4 h-4" /> Generate Lab Report
              </Button>
              <Button className="w-full gap-2" onClick={() => openReportModal(appointments.find(a => a._id === completeId), 'Discharge Summary')}>
                <FileText className="w-4 h-4" /> Generate Discharge Summary
              </Button>
              <Button className="w-full gap-2" onClick={() => setBillModal(true)}>
                <IndianRupee className="w-4 h-4" /> Generate Bill
              </Button>
              <Button variant="outline" className="w-full gap-2" onClick={async () => { await api.updateAppointment(completeId, { status: 'Completed' }); setCompleteId(null); loadAppointments(); }}>
                <CheckCircle className="w-4 h-4" /> Complete Without Report/Bill
              </Button>
            </div>
            <Button variant="ghost" className="w-full mt-3" onClick={() => setCompleteId(null)}>Cancel</Button>
          </motion.div>
        </div>
      )}

      {/* Prescription Report Modal */}
      {showReportModal && reportType === 'Prescription' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Create New Prescription</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name</label>
                  <Input value={prescriptionData.patientName} onChange={e => setPrescriptionData({ ...prescriptionData, patientName: e.target.value })} placeholder="Enter patient name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Age</label>
                    <Input type="number" value={prescriptionData.age} onChange={e => setPrescriptionData({ ...prescriptionData, age: e.target.value })} placeholder="Age" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label>
                    <select value={prescriptionData.gender} onChange={e => setPrescriptionData({ ...prescriptionData, gender: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                  <Input value={prescriptionData.phone} onChange={e => setPrescriptionData({ ...prescriptionData, phone: e.target.value })} placeholder="Phone number" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input type="email" value={prescriptionData.email} onChange={e => setPrescriptionData({ ...prescriptionData, email: e.target.value })} placeholder="Email" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
                <Input value={prescriptionData.address} onChange={e => setPrescriptionData({ ...prescriptionData, address: e.target.value })} placeholder="Address" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Doctor Name</label>
                  <Input value={prescriptionData.doctorName} onChange={e => setPrescriptionData({ ...prescriptionData, doctorName: e.target.value })} placeholder="Doctor name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Specialization</label>
                  <Input value={prescriptionData.specialization} onChange={e => setPrescriptionData({ ...prescriptionData, specialization: e.target.value })} placeholder="Specialization" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label>
                <Input value={prescriptionData.chiefComplaints} onChange={e => setPrescriptionData({ ...prescriptionData, chiefComplaints: e.target.value })} placeholder="Enter chief complaints" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis</label>
                <Input value={prescriptionData.diagnosis} onChange={e => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })} placeholder="Enter diagnosis" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Medications</label>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => addMedication('Prescription')}>
                    <Plus className="w-3 h-3" /> Add Medication
                  </Button>
                </div>
                {prescriptionData.medications.map((med, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={med.name} onChange={e => updateMedication('Prescription', idx, 'name', e.target.value)} placeholder="Medicine name" className="flex-1" />
                    <Input value={med.dosage} onChange={e => updateMedication('Prescription', idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-24" />
                    <Input value={med.frequency} onChange={e => updateMedication('Prescription', idx, 'frequency', e.target.value)} placeholder="Frequency" className="w-28" />
                    <Input value={med.instructions} onChange={e => updateMedication('Prescription', idx, 'instructions', e.target.value)} placeholder="Instructions" className="flex-1" />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeMedication('Prescription', idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Advice</label>
                <Input value={prescriptionData.advice} onChange={e => setPrescriptionData({ ...prescriptionData, advice: e.target.value })} placeholder="Advice for patient" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up</label>
                <Input value={prescriptionData.followUp} onChange={e => setPrescriptionData({ ...prescriptionData, followUp: e.target.value })} placeholder="Follow-up date" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGeneratePrescription} disabled={!prescriptionData.diagnosis}>
                <Send className="w-4 h-4" /> Generate & Send
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lab Report Modal */}
      {showReportModal && reportType === 'Lab Report' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Create Laboratory Test Report</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name</label>
                  <Input value={labReportData.patientName} onChange={e => setLabReportData({ ...labReportData, patientName: e.target.value })} placeholder="Patient name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Age</label>
                    <Input type="number" value={labReportData.age} onChange={e => setLabReportData({ ...labReportData, age: e.target.value })} placeholder="Age" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label>
                    <select value={labReportData.gender} onChange={e => setLabReportData({ ...labReportData, gender: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                  <Input value={labReportData.phone} onChange={e => setLabReportData({ ...labReportData, phone: e.target.value })} placeholder="Phone" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input type="email" value={labReportData.email} onChange={e => setLabReportData({ ...labReportData, email: e.target.value })} placeholder="Email" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Doctor Name</label>
                  <Input value={labReportData.doctorName} onChange={e => setLabReportData({ ...labReportData, doctorName: e.target.value })} placeholder="Doctor name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Specialization</label>
                  <Input value={labReportData.specialization} onChange={e => setLabReportData({ ...labReportData, specialization: e.target.value })} placeholder="Specialization" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Report ID</label>
                  <Input value={labReportData.reportId} onChange={e => setLabReportData({ ...labReportData, reportId: e.target.value })} placeholder="Report ID" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Test Date</label>
                  <Input type="date" value={labReportData.testDate} onChange={e => setLabReportData({ ...labReportData, testDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Report Date</label>
                  <Input type="date" value={labReportData.reportDate} onChange={e => setLabReportData({ ...labReportData, reportDate: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Test Results</label>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={addTest}>
                    <Plus className="w-3 h-3" /> Add Test
                  </Button>
                </div>
                {labReportData.tests.map((test, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={test.name} onChange={e => updateTest(idx, 'name', e.target.value)} placeholder="Test name" className="flex-1" />
                    <Input value={test.result} onChange={e => updateTest(idx, 'result', e.target.value)} placeholder="Result" className="w-24" />
                    <Input value={test.unit} onChange={e => updateTest(idx, 'unit', e.target.value)} placeholder="Unit" className="w-20" />
                    <Input value={test.referenceRange} onChange={e => updateTest(idx, 'referenceRange', e.target.value)} placeholder="Ref. Range" className="w-28" />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeTest(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
                <textarea value={labReportData.notes} onChange={e => setLabReportData({ ...labReportData, notes: e.target.value })} placeholder="Notes..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-16" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerateLabReport} disabled={!labReportData.reportId}>
                <Send className="w-4 h-4" /> Generate & Send
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Discharge Summary Modal */}
      {showReportModal && reportType === 'Discharge Summary' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Create Patient Discharge Summary</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name</label>
                  <Input value={dischargeData.patientName} onChange={e => setDischargeData({ ...dischargeData, patientName: e.target.value })} placeholder="Patient name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Age</label>
                    <Input type="number" value={dischargeData.age} onChange={e => setDischargeData({ ...dischargeData, age: e.target.value })} placeholder="Age" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label>
                    <select value={dischargeData.gender} onChange={e => setDischargeData({ ...dischargeData, gender: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                  <Input value={dischargeData.phone} onChange={e => setDischargeData({ ...dischargeData, phone: e.target.value })} placeholder="Phone" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                  <Input type="email" value={dischargeData.email} onChange={e => setDischargeData({ ...dischargeData, email: e.target.value })} placeholder="Email" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
                <Input value={dischargeData.address} onChange={e => setDischargeData({ ...dischargeData, address: e.target.value })} placeholder="Address" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Doctor Name</label>
                  <Input value={dischargeData.doctorName} onChange={e => setDischargeData({ ...dischargeData, doctorName: e.target.value })} placeholder="Doctor name" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Specialization</label>
                  <Input value={dischargeData.specialization} onChange={e => setDischargeData({ ...dischargeData, specialization: e.target.value })} placeholder="Specialization" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Admission ID</label>
                  <Input value={dischargeData.admissionId} onChange={e => setDischargeData({ ...dischargeData, admissionId: e.target.value })} placeholder="Admission ID" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Admission Date</label>
                  <Input type="date" value={dischargeData.admissionDate} onChange={e => setDischargeData({ ...dischargeData, admissionDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Discharge Date</label>
                  <Input type="date" value={dischargeData.dischargeDate} onChange={e => setDischargeData({ ...dischargeData, dischargeDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints on Admission</label>
                <Input value={dischargeData.chiefComplaints} onChange={e => setDischargeData({ ...dischargeData, chiefComplaints: e.target.value })} placeholder="Chief complaints" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis</label>
                <Input value={dischargeData.diagnosis} onChange={e => setDischargeData({ ...dischargeData, diagnosis: e.target.value })} placeholder="Diagnosis" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Treatment Given</label>
                <textarea value={dischargeData.treatmentGiven} onChange={e => setDischargeData({ ...dischargeData, treatmentGiven: e.target.value })} placeholder="Treatment given"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-16" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Surgery/Procedure (if any)</label>
                <Input value={dischargeData.surgery} onChange={e => setDischargeData({ ...dischargeData, surgery: e.target.value })} placeholder="Surgery or procedure" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Discharge Medications</label>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => addMedication('Discharge')}>
                    <Plus className="w-3 h-3" /> Add Medication
                  </Button>
                </div>
                {dischargeData.medications.map((med, idx) => (
                  <div key={idx} className="flex gap-2 mb-2 items-start">
                    <Input value={med.name} onChange={e => updateMedication('Discharge', idx, 'name', e.target.value)} placeholder="Medicine name" className="flex-1" />
                    <Input value={med.dosage} onChange={e => updateMedication('Discharge', idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-24" />
                    <Input value={med.frequency} onChange={e => updateMedication('Discharge', idx, 'frequency', e.target.value)} placeholder="Frequency" className="w-28" />
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeMedication('Discharge', idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Discharge Advice</label>
                <textarea value={dischargeData.dischargeAdvice} onChange={e => setDischargeData({ ...dischargeData, dischargeAdvice: e.target.value })} placeholder="Discharge advice"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-16" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up Instructions</label>
                <Input value={dischargeData.followUpInstructions} onChange={e => setDischargeData({ ...dischargeData, followUpInstructions: e.target.value })} placeholder="Follow-up instructions" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerateDischargeSummary} disabled={!dischargeData.diagnosis}>
                <Send className="w-4 h-4" /> Generate & Send
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bill Generation Modal */}
      {billModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setBillModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Generate Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Service</label>
                <Input value={`${appointments.find(a => a._id === completeId)?.type || 'Consultation'} - ${appointments.find(a => a._id === completeId)?.department || ''}`} disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Amount (₹) — default uses your registered consultation fee</label>
                <Input type="number" value={billAmount} onChange={e => setBillAmount(Number(e.target.value))} min={0} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setBillModal(null)}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleGenerateBill} disabled={!billAmount}>
                <Send className="w-4 h-4" /> Generate & Send
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
