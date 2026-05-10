import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Loader2, Send } from 'lucide-react';
import { getStoredAuthToken } from '@/lib/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function PDFReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('prescription');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [prescription, setPrescription] = useState({
    patientName: '', patientAge: '', patientGender: '', patientPhone: '', patientEmail: '', patientAddress: '',
    doctorName: '', doctorSpecialization: '',
    chiefComplaints: '', diagnosis: '', advice: '', followUp: '',
    medications: [{ name: '', dosage: '', frequency: '', instructions: '' }]
  });

  const [labReport, setLabReport] = useState({
    patientName: '', patientAge: '', patientGender: '', patientPhone: '', patientEmail: '',
    doctorName: '', doctorSpecialization: '',
    reportId: '', testDate: '', reportDate: '',
    notes: '',
    tests: [{ name: '', result: '', unit: '', referenceRange: '' }]
  });

  const [discharge, setDischarge] = useState({
    patientName: '', patientAge: '', patientGender: '', patientPhone: '', patientEmail: '', patientAddress: '',
    doctorName: '', doctorSpecialization: '',
    admissionId: '', admissionDate: '', dischargeDate: '',
    chiefComplaints: '', diagnosis: '', treatment: '', surgery: '',
    dischargeAdvice: '', followUpInstructions: '',
    medications: [{ name: '', dosage: '', frequency: '' }]
  });

  const addMedication = () => {
    setPrescription({ ...prescription, medications: [...prescription.medications, { name: '', dosage: '', frequency: '', instructions: '' }] });
  };

  const updateMedication = (index, field, value) => {
    const updated = [...prescription.medications];
    updated[index][field] = value;
    setPrescription({ ...prescription, medications: updated });
  };

  const removeMedication = (index) => {
    setPrescription({ ...prescription, medications: prescription.medications.filter((_, i) => i !== index) });
  };

  const addTest = () => {
    setLabReport({ ...labReport, tests: [...labReport.tests, { name: '', result: '', unit: '', referenceRange: '' }] });
  };

  const updateTest = (index, field, value) => {
    const updated = [...labReport.tests];
    updated[index][field] = value;
    setLabReport({ ...labReport, tests: updated });
  };

  const removeTest = (index) => {
    setLabReport({ ...labReport, tests: labReport.tests.filter((_, i) => i !== index) });
  };

  const addDischargeMed = () => {
    setDischarge({ ...discharge, medications: [...discharge.medications, { name: '', dosage: '', frequency: '' }] });
  };

  const updateDischargeMed = (index, field, value) => {
    const updated = [...discharge.medications];
    updated[index][field] = value;
    setDischarge({ ...discharge, medications: updated });
  };

  const buildReportPayload = (type) => {
    if (type === 'prescription') {
      return {
        patient: { name: prescription.patientName, age: prescription.patientAge, gender: prescription.patientGender, phone: prescription.patientPhone, email: prescription.patientEmail, address: prescription.patientAddress },
        doctor: { name: prescription.doctorName, specialization: prescription.doctorSpecialization },
        chiefComplaints: prescription.chiefComplaints, diagnosis: prescription.diagnosis, advice: prescription.advice, followUp: prescription.followUp,
        medications: prescription.medications.filter(m => m.name)
      };
    }

    if (type === 'lab') {
      return {
        patient: { name: labReport.patientName, age: labReport.patientAge, gender: labReport.patientGender, phone: labReport.patientPhone, email: labReport.patientEmail },
        doctor: { name: labReport.doctorName, specialization: labReport.doctorSpecialization },
        reportId: labReport.reportId, testDate: labReport.testDate, reportDate: labReport.reportDate, notes: labReport.notes,
        tests: labReport.tests.filter(t => t.name)
      };
    }

    return {
      patient: { name: discharge.patientName, age: discharge.patientAge, gender: discharge.patientGender, phone: discharge.patientPhone, email: discharge.patientEmail, address: discharge.patientAddress },
      doctor: { name: discharge.doctorName, specialization: discharge.doctorSpecialization },
      admissionId: discharge.admissionId, admissionDate: discharge.admissionDate, dischargeDate: discharge.dischargeDate,
      chiefComplaints: discharge.chiefComplaints, diagnosis: discharge.diagnosis, treatment: discharge.treatment, surgery: discharge.surgery,
      dischargeAdvice: discharge.dischargeAdvice, followUpInstructions: discharge.followUpInstructions,
      medications: discharge.medications.filter(m => m.name)
    };
  };

  const generatePDF = async (type) => {
    setLoading(true);
    setStatusMessage('');
    setErrorMessage('');
    try {
      const endpoint = type === 'prescription' ? '/reports/generate-prescription'
        : type === 'lab' ? '/reports/generate-lab-report'
        : '/reports/generate-discharge-summary';
      const payload = buildReportPayload(type);

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredAuthToken()}`,
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('PDF generation failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setStatusMessage('PDF downloaded successfully.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setErrorMessage(error.message || 'Error generating PDF');
    }
    setLoading(false);
  };

  const sendViaEmail = async (type) => {
    setLoading(true);
    setStatusMessage('');
    setErrorMessage('');
    try {
      const reportPayload = buildReportPayload(type);
      if (!reportPayload.patient?.email) {
        throw new Error('Patient email is required before sending.');
      }

      const endpoint = type === 'prescription' ? '/reports/email/prescription'
        : type === 'lab' ? '/reports/email/lab-result'
        : '/reports/email/discharge-summary';
      const payload = type === 'prescription' ? {
        patient: reportPayload.patient,
        prescription: reportPayload
      } : type === 'lab' ? {
        patient: reportPayload.patient,
        report: reportPayload
      } : {
        patient: reportPayload.patient,
        summary: reportPayload
      };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredAuthToken()}`,
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Email send failed');
      }

      setStatusMessage('Report emailed successfully.');
    } catch (error) {
      console.error('Error sending email:', error);
      setErrorMessage(error.message || 'Error sending email');
    }
    setLoading(false);
  };

  if (user?.role === 'patient') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View and download your medical reports</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Medical Reports</CardTitle>
            <CardDescription>Your prescriptions, lab reports, and discharge summaries</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Contact your doctor to generate new reports. Existing reports can be found in your medical records.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports Generation</h1>
        <p className="text-muted-foreground">Generate prescriptions, lab reports, and discharge summaries</p>
      </div>

      {statusMessage && <div className="rounded-lg border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">{statusMessage}</div>}
      {errorMessage && <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="prescription">Prescription</TabsTrigger>
          <TabsTrigger value="lab">Lab Report</TabsTrigger>
          <TabsTrigger value="discharge">Discharge Summary</TabsTrigger>
        </TabsList>

        {/* PRESCRIPTION TAB */}
        <TabsContent value="prescription">
          <Card>
            <CardHeader>
              <CardTitle>Generate Prescription</CardTitle>
              <CardDescription>Create a new prescription with patient and medication details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Patient Name</Label><Input value={prescription.patientName} onChange={(e) => setPrescription({...prescription, patientName: e.target.value})} placeholder="Enter patient name" /></div>
                <div><Label>Age</Label><Input type="number" value={prescription.patientAge} onChange={(e) => setPrescription({...prescription, patientAge: e.target.value})} placeholder="Age" /></div>
                <div><Label>Gender</Label><Select value={prescription.patientGender} onValueChange={(v) => setPrescription({...prescription, patientGender: v})}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                <div><Label>Phone</Label><Input value={prescription.patientPhone} onChange={(e) => setPrescription({...prescription, patientPhone: e.target.value})} placeholder="Phone number" /></div>
                <div><Label>Email</Label><Input type="email" value={prescription.patientEmail} onChange={(e) => setPrescription({...prescription, patientEmail: e.target.value})} placeholder="Email" /></div>
                <div><Label>Address</Label><Input value={prescription.patientAddress} onChange={(e) => setPrescription({...prescription, patientAddress: e.target.value})} placeholder="Address" /></div>
                <div><Label>Doctor Name</Label><Input value={prescription.doctorName} onChange={(e) => setPrescription({...prescription, doctorName: e.target.value})} placeholder="Doctor name" /></div>
                <div><Label>Specialization</Label><Input value={prescription.doctorSpecialization} onChange={(e) => setPrescription({...prescription, doctorSpecialization: e.target.value})} placeholder="Specialization" /></div>
              </div>
              <div><Label>Chief Complaints</Label><Textarea value={prescription.chiefComplaints} onChange={(e) => setPrescription({...prescription, chiefComplaints: e.target.value})} placeholder="Enter chief complaints" /></div>
              <div><Label>Diagnosis</Label><Textarea value={prescription.diagnosis} onChange={(e) => setPrescription({...prescription, diagnosis: e.target.value})} placeholder="Enter diagnosis" /></div>
              
              <div>
                <Label className="text-base font-semibold">Medications</Label>
                {prescription.medications.map((med, idx) => (
                  <div key={idx} className="flex gap-2 mt-2">
                    <Input value={med.name} onChange={(e) => updateMedication(idx, 'name', e.target.value)} placeholder="Medicine name" className="flex-1" />
                    <Input value={med.dosage} onChange={(e) => updateMedication(idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-24" />
                    <Input value={med.frequency} onChange={(e) => updateMedication(idx, 'frequency', e.target.value)} placeholder="Frequency" className="w-28" />
                    <Input value={med.instructions} onChange={(e) => updateMedication(idx, 'instructions', e.target.value)} placeholder="Instructions" className="flex-1" />
                    <Button variant="destructive" size="sm" onClick={() => removeMedication(idx)}>X</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addMedication} className="mt-2">+ Add Medication</Button>
              </div>

              <div><Label>Advice</Label><Textarea value={prescription.advice} onChange={(e) => setPrescription({...prescription, advice: e.target.value})} placeholder="Advice for patient" /></div>
              <div><Label>Follow-up</Label><Input value={prescription.followUp} onChange={(e) => setPrescription({...prescription, followUp: e.target.value})} placeholder="Follow-up date" /></div>

              <div className="flex gap-2">
                <Button onClick={() => generatePDF('prescription')} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}Download PDF</Button>
                <Button variant="outline" onClick={() => sendViaEmail('prescription')} disabled={loading}><Send className="w-4 h-4 mr-2" />Send via Email</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LAB REPORT TAB */}
        <TabsContent value="lab">
          <Card>
            <CardHeader>
              <CardTitle>Generate Lab Report</CardTitle>
              <CardDescription>Create a laboratory test report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Patient Name</Label><Input value={labReport.patientName} onChange={(e) => setLabReport({...labReport, patientName: e.target.value})} placeholder="Patient name" /></div>
                <div><Label>Age</Label><Input type="number" value={labReport.patientAge} onChange={(e) => setLabReport({...labReport, patientAge: e.target.value})} placeholder="Age" /></div>
                <div><Label>Gender</Label><Select value={labReport.patientGender} onValueChange={(v) => setLabReport({...labReport, patientGender: v})}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                <div><Label>Phone</Label><Input value={labReport.patientPhone} onChange={(e) => setLabReport({...labReport, patientPhone: e.target.value})} placeholder="Phone" /></div>
                <div><Label>Email</Label><Input type="email" value={labReport.patientEmail} onChange={(e) => setLabReport({...labReport, patientEmail: e.target.value})} placeholder="Email" /></div>
                <div><Label>Doctor Name</Label><Input value={labReport.doctorName} onChange={(e) => setLabReport({...labReport, doctorName: e.target.value})} placeholder="Doctor name" /></div>
                <div><Label>Specialization</Label><Input value={labReport.doctorSpecialization} onChange={(e) => setLabReport({...labReport, doctorSpecialization: e.target.value})} placeholder="Specialization" /></div>
                <div><Label>Report ID</Label><Input value={labReport.reportId} onChange={(e) => setLabReport({...labReport, reportId: e.target.value})} placeholder="Report ID" /></div>
                <div><Label>Test Date</Label><Input type="date" value={labReport.testDate} onChange={(e) => setLabReport({...labReport, testDate: e.target.value})} /></div>
                <div><Label>Report Date</Label><Input type="date" value={labReport.reportDate} onChange={(e) => setLabReport({...labReport, reportDate: e.target.value})} /></div>
              </div>

              <div>
                <Label className="text-base font-semibold">Test Results</Label>
                {labReport.tests.map((test, idx) => (
                  <div key={idx} className="flex gap-2 mt-2">
                    <Input value={test.name} onChange={(e) => updateTest(idx, 'name', e.target.value)} placeholder="Test name" className="flex-1" />
                    <Input value={test.result} onChange={(e) => updateTest(idx, 'result', e.target.value)} placeholder="Result" className="w-28" />
                    <Input value={test.unit} onChange={(e) => updateTest(idx, 'unit', e.target.value)} placeholder="Unit" className="w-20" />
                    <Input value={test.referenceRange} onChange={(e) => updateTest(idx, 'referenceRange', e.target.value)} placeholder="Ref. Range" className="w-32" />
                    <Button variant="destructive" size="sm" onClick={() => removeTest(idx)}>X</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addTest} className="mt-2">+ Add Test</Button>
              </div>

              <div><Label>Notes</Label><Textarea value={labReport.notes} onChange={(e) => setLabReport({...labReport, notes: e.target.value})} placeholder="Additional notes" /></div>

              <div className="flex gap-2">
                <Button onClick={() => generatePDF('lab')} disabled={loading}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
                <Button variant="outline" onClick={() => sendViaEmail('lab')} disabled={loading}><Send className="w-4 h-4 mr-2" />Send via Email</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISCHARGE SUMMARY TAB */}
        <TabsContent value="discharge">
          <Card>
            <CardHeader>
              <CardTitle>Generate Discharge Summary</CardTitle>
              <CardDescription>Create a patient discharge summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Patient Name</Label><Input value={discharge.patientName} onChange={(e) => setDischarge({...discharge, patientName: e.target.value})} placeholder="Patient name" /></div>
                <div><Label>Age</Label><Input type="number" value={discharge.patientAge} onChange={(e) => setDischarge({...discharge, patientAge: e.target.value})} placeholder="Age" /></div>
                <div><Label>Gender</Label><Select value={discharge.patientGender} onValueChange={(v) => setDischarge({...discharge, patientGender: v})}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                <div><Label>Phone</Label><Input value={discharge.patientPhone} onChange={(e) => setDischarge({...discharge, patientPhone: e.target.value})} placeholder="Phone" /></div>
                <div><Label>Email</Label><Input type="email" value={discharge.patientEmail} onChange={(e) => setDischarge({...discharge, patientEmail: e.target.value})} placeholder="Email" /></div>
                <div><Label>Address</Label><Input value={discharge.patientAddress} onChange={(e) => setDischarge({...discharge, patientAddress: e.target.value})} placeholder="Address" /></div>
                <div><Label>Doctor Name</Label><Input value={discharge.doctorName} onChange={(e) => setDischarge({...discharge, doctorName: e.target.value})} placeholder="Doctor name" /></div>
                <div><Label>Specialization</Label><Input value={discharge.doctorSpecialization} onChange={(e) => setDischarge({...discharge, doctorSpecialization: e.target.value})} placeholder="Specialization" /></div>
                <div><Label>Admission ID</Label><Input value={discharge.admissionId} onChange={(e) => setDischarge({...discharge, admissionId: e.target.value})} placeholder="Admission ID" /></div>
                <div><Label>Admission Date</Label><Input type="date" value={discharge.admissionDate} onChange={(e) => setDischarge({...discharge, admissionDate: e.target.value})} /></div>
                <div><Label>Discharge Date</Label><Input type="date" value={discharge.dischargeDate} onChange={(e) => setDischarge({...discharge, dischargeDate: e.target.value})} /></div>
              </div>

              <div><Label>Chief Complaints on Admission</Label><Textarea value={discharge.chiefComplaints} onChange={(e) => setDischarge({...discharge, chiefComplaints: e.target.value})} placeholder="Chief complaints" /></div>
              <div><Label>Diagnosis</Label><Textarea value={discharge.diagnosis} onChange={(e) => setDischarge({...discharge, diagnosis: e.target.value})} placeholder="Diagnosis" /></div>
              <div><Label>Treatment Given</Label><Textarea value={discharge.treatment} onChange={(e) => setDischarge({...discharge, treatment: e.target.value})} placeholder="Treatment given" /></div>
              <div><Label>Surgery/Procedure (if any)</Label><Textarea value={discharge.surgery} onChange={(e) => setDischarge({...discharge, surgery: e.target.value})} placeholder="Surgery or procedure" /></div>

              <div>
                <Label className="text-base font-semibold">Discharge Medications</Label>
                {discharge.medications.map((med, idx) => (
                  <div key={idx} className="flex gap-2 mt-2">
                    <Input value={med.name} onChange={(e) => updateDischargeMed(idx, 'name', e.target.value)} placeholder="Medicine name" className="flex-1" />
                    <Input value={med.dosage} onChange={(e) => updateDischargeMed(idx, 'dosage', e.target.value)} placeholder="Dosage" className="w-32" />
                    <Input value={med.frequency} onChange={(e) => updateDischargeMed(idx, 'frequency', e.target.value)} placeholder="Frequency" className="w-32" />
                    <Button variant="destructive" size="sm" onClick={() => setDischarge({...discharge, medications: discharge.medications.filter((_, i) => i !== idx)})}>X</Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addDischargeMed} className="mt-2">+ Add Medication</Button>
              </div>

              <div><Label>Discharge Advice</Label><Textarea value={discharge.dischargeAdvice} onChange={(e) => setDischarge({...discharge, dischargeAdvice: e.target.value})} placeholder="Discharge advice" /></div>
              <div><Label>Follow-up Instructions</Label><Textarea value={discharge.followUpInstructions} onChange={(e) => setDischarge({...discharge, followUpInstructions: e.target.value})} placeholder="Follow-up instructions" /></div>

              <div className="flex gap-2">
                <Button onClick={() => generatePDF('discharge')} disabled={loading}><Download className="w-4 h-4 mr-2" />Download PDF</Button>
                <Button variant="outline" onClick={() => sendViaEmail('discharge')} disabled={loading}><Send className="w-4 h-4 mr-2" />Send via Email</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
