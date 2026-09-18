import React, { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, FileText, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, Camera, FolderOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function IntakeFormStep({ formData, setFormData, onNext, onBack }) {
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [uploadMenu, setUploadMenu] = useState(null); // 'prescription' | 'report' | null
  
  const [activeSection, setActiveSection] = useState('chief_complaint');

  const prescriptionInputRef = useRef(null);
  const reportInputRef = useRef(null);
  const prescriptionCameraRef = useRef(null);
  const reportCameraRef = useRef(null);

  const sectionRefs = {
    chief_complaint: useRef(null),
    past_history: useRef(null),
    current_treatment: useRef(null),
    test_reports: useRef(null),
    current_meds: useRef(null),
    allergies: useRef(null),
    family_history: useRef(null)
  };

  const handleUpload = async (e, setUploading, fieldPath) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 25MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);

    try {
      const res = await api.uploadFile(file, { purpose: 'intake', createRecord: false });
      if (res && res.url) {
        toast.success('File uploaded successfully');
        if (fieldPath === 'prescriptionFile') {
          setFormData(prev => ({
            ...prev,
            currentTreatment: { ...prev.currentTreatment, prescriptionFile: res.url }
          }));
        } else if (fieldPath === 'reportFile') {
          setFormData(prev => ({
            ...prev,
            testReports: { ...prev.testReports, reportFile: res.url }
          }));
        }
      } else {
        throw new Error('Upload succeeded but no URL returned');
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to upload file';
      toast.error(`Upload failed: ${errorMsg}. Please try again.`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const scrollToSection = (id) => {
    setTimeout(() => {
      sectionRefs[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const advanceTo = (id) => {
    setActiveSection(id);
    scrollToSection(id);
  };

  const chiefComplaintsList = [
    'Headache', 'Fever', 'Stomach ache', 'Cold / Cough', 'Body ache', 'Skin issues', 'Other'
  ];

  // Render function (NOT a component) to prevent re-mounting inputs on each keystroke
  const renderSection = (id, title, isCompleted, children) => {
    const isActive = activeSection === id;
    
    return (
      <div 
        ref={sectionRefs[id]}
        className={`border rounded-xl transition-all duration-300 overflow-hidden bg-card ${isActive ? 'border-primary ring-1 ring-primary/20 shadow-md my-4' : 'border-border/60 my-2 hover:border-primary/40'}`}
      >
        <button 
          type="button" 
          onClick={() => { setActiveSection(isActive ? null : id); if(!isActive) scrollToSection(id); }}
          className={`w-full flex items-center justify-between p-3.5 text-left transition-colors ${isActive ? 'bg-primary/5' : 'bg-transparent'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isCompleted ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/60 text-white'}`}>
              {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-2 h-2 rounded-full bg-current opacity-80" />}
            </div>
            <span className={`font-semibold text-sm ${isActive ? 'text-primary' : 'text-foreground'}`}>{title}</span>
          </div>
          {isActive ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        
        {isActive && (
          <div className="p-4 pt-2 border-t border-primary/10 animate-in slide-in-from-top-1 fade-in duration-200">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1.5 custom-scrollbar pb-4 relative">
      
      {/* 1. Chief Complaint */}
      {renderSection('chief_complaint', 'Chief Complaint & Duration', !!formData.chiefComplaint, (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Chief Complaint / Main Symptom <span className="text-destructive">*</span></Label>
            <Select 
              value={formData.chiefComplaint} 
              onValueChange={(val) => setFormData(p => ({ ...p, chiefComplaint: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your main problem" />
              </SelectTrigger>
              <SelectContent>
                {chiefComplaintsList.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.chiefComplaint === 'Other' && (
              <Input 
                placeholder="Please specify your problem" 
                value={formData.chiefComplaintOther}
                onChange={(e) => setFormData(p => ({ ...p, chiefComplaintOther: e.target.value }))}
                className="mt-2"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Duration (Kab se hai / How long)</Label>
            <Textarea 
              placeholder="E.g., Since 3 days, For 2 weeks..." 
              value={formData.symptomsDuration}
              onChange={(e) => setFormData(p => ({ ...p, symptomsDuration: e.target.value }))}
              className="resize-none h-16"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => advanceTo('past_history')}>Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
          </div>
        </div>
      ))}

      {/* 2. Past Medical History */}
      {renderSection('past_history', 'Past Medical History', formData.pastMedicalHistory.hasHistory === null ? false : (formData.pastMedicalHistory.hasHistory ? !!formData.pastMedicalHistory.details : true), (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Do you have any past medical conditions like Diabetes, Blood Pressure, Asthma?</p>
          <div className="flex gap-2">
            <Button type="button" variant={formData.pastMedicalHistory.hasHistory === true ? "default" : "outline"} size="sm" onClick={() => setFormData(p => ({ ...p, pastMedicalHistory: { ...p.pastMedicalHistory, hasHistory: true } }))}>Yes</Button>
            <Button type="button" variant={formData.pastMedicalHistory.hasHistory === false ? "default" : "outline"} size="sm" onClick={() => { setFormData(p => ({ ...p, pastMedicalHistory: { ...p.pastMedicalHistory, hasHistory: false, details: '' } })); advanceTo('current_treatment'); }}>No</Button>
          </div>
          {formData.pastMedicalHistory.hasHistory && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <Textarea 
                placeholder="Please detail your past medical history" 
                value={formData.pastMedicalHistory.details}
                onChange={(e) => setFormData(p => ({ ...p, pastMedicalHistory: { ...p.pastMedicalHistory, details: e.target.value } }))}
                className="resize-none h-16 mt-2"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => advanceTo('current_treatment')}>Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 3. Current / Past Treatment */}
      {renderSection('current_treatment', 'Current / Past Treatment', formData.currentTreatment.hasPastTreatment === null ? false : (formData.currentTreatment.hasPastTreatment ? (!!formData.currentTreatment.doctorName || !!formData.currentTreatment.prescriptionFile) : true), (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Are you currently taking or have taken treatment from another doctor for this?</p>
          <div className="flex gap-2">
            <Button type="button" variant={formData.currentTreatment.hasPastTreatment === true ? "default" : "outline"} size="sm" onClick={() => setFormData(p => ({ ...p, currentTreatment: { ...p.currentTreatment, hasPastTreatment: true } }))}>Yes</Button>
            <Button type="button" variant={formData.currentTreatment.hasPastTreatment === false ? "default" : "outline"} size="sm" onClick={() => { setFormData(p => ({ ...p, currentTreatment: { hasPastTreatment: false, doctorName: '', cityState: '', when: '', prescriptionFile: '', takingMedicines: false } })); advanceTo('test_reports'); }}>No</Button>
          </div>
          
          {formData.currentTreatment.hasPastTreatment && (
            <div className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Doctor Name</Label>
                  <Input value={formData.currentTreatment.doctorName} onChange={(e) => setFormData(p => ({ ...p, currentTreatment: { ...p.currentTreatment, doctorName: e.target.value } }))} placeholder="Dr. Name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">City / State</Label>
                  <Input value={formData.currentTreatment.cityState} onChange={(e) => setFormData(p => ({ ...p, currentTreatment: { ...p.currentTreatment, cityState: e.target.value } }))} placeholder="City, State" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">When did you consult?</Label>
                <Input value={formData.currentTreatment.when} onChange={(e) => setFormData(p => ({ ...p, currentTreatment: { ...p.currentTreatment, when: e.target.value } }))} placeholder="E.g., 2 weeks ago" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs block text-muted-foreground">Upload Prescription</Label>
                <input type="file" ref={prescriptionInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleUpload(e, setUploadingPrescription, 'prescriptionFile')} />
                <input type="file" ref={prescriptionCameraRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleUpload(e, setUploadingPrescription, 'prescriptionFile')} />
                {formData.currentTreatment.prescriptionFile ? (
                  <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-primary font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Prescription Uploaded
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => setFormData(p => ({ ...p, currentTreatment: { ...p.currentTreatment, prescriptionFile: '' } }))}>Remove</Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5" onClick={() => setUploadMenu(uploadMenu === 'prescription' ? null : 'prescription')} disabled={uploadingPrescription}>
                      {uploadingPrescription ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-primary/70" />}
                      {uploadingPrescription ? 'Uploading...' : 'Click to Upload Prescription'}
                    </Button>
                    {uploadMenu === 'prescription' && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                        <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-primary/5 transition-colors" onClick={() => { setUploadMenu(null); prescriptionCameraRef.current?.click(); }}>
                          <Camera className="w-4 h-4 text-primary" /> Take Photo
                        </button>
                        <div className="border-t border-border/40" />
                        <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-primary/5 transition-colors" onClick={() => { setUploadMenu(null); prescriptionInputRef.current?.click(); }}>
                          <FolderOpen className="w-4 h-4 text-primary" /> Upload from Device
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs block text-muted-foreground">Are you currently taking medicines prescribed by this doctor?</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={formData.currentTreatment.takingMedicines ? "default" : "outline"} size="sm" onClick={() => setFormData(p => ({ ...p, currentTreatment: { ...p.currentTreatment, takingMedicines: true } }))}>Yes</Button>
                  <Button type="button" variant={!formData.currentTreatment.takingMedicines ? "default" : "outline"} size="sm" onClick={() => setFormData(p => ({ ...p, currentTreatment: { ...p.currentTreatment, takingMedicines: false } }))}>No</Button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => advanceTo('test_reports')}>Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 4. Test Reports */}
      {renderSection('test_reports', 'Recent Test Reports', formData.testReports.hasReports === null ? false : (formData.testReports.hasReports ? !!formData.testReports.reportFile : true), (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Do you have any recent lab tests or scan reports to show?</p>
          <div className="flex gap-2">
            <Button type="button" variant={formData.testReports.hasReports === true ? "default" : "outline"} size="sm" onClick={() => setFormData(p => ({ ...p, testReports: { ...p.testReports, hasReports: true } }))}>Yes</Button>
            <Button type="button" variant={formData.testReports.hasReports === false ? "default" : "outline"} size="sm" onClick={() => { setFormData(p => ({ ...p, testReports: { hasReports: false, reportFile: '' } })); advanceTo('current_meds'); }}>No</Button>
          </div>
          
          {formData.testReports.hasReports && (
            <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
              <input type="file" ref={reportInputRef} className="hidden" accept=".pdf,image/*" onChange={(e) => handleUpload(e, setUploadingReport, 'reportFile')} />
              <input type="file" ref={reportCameraRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleUpload(e, setUploadingReport, 'reportFile')} />
              {formData.testReports.reportFile ? (
                <div className="flex items-center justify-between p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Report Uploaded
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => setFormData(p => ({ ...p, testReports: { ...p.testReports, reportFile: '' } }))}>Remove</Button>
                </div>
              ) : (
                <div className="relative">
                  <Button type="button" variant="outline" size="sm" className="w-full gap-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5" onClick={() => setUploadMenu(uploadMenu === 'report' ? null : 'report')} disabled={uploadingReport}>
                    {uploadingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-primary/70" />}
                    {uploadingReport ? 'Uploading...' : 'Upload Test Report'}
                  </Button>
                  {uploadMenu === 'report' && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                      <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-primary/5 transition-colors" onClick={() => { setUploadMenu(null); reportCameraRef.current?.click(); }}>
                        <Camera className="w-4 h-4 text-primary" /> Take Photo
                      </button>
                      <div className="border-t border-border/40" />
                      <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-primary/5 transition-colors" onClick={() => { setUploadMenu(null); reportInputRef.current?.click(); }}>
                        <FolderOpen className="w-4 h-4 text-primary" /> Upload from Device
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={() => advanceTo('current_meds')}>Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 5. Current General Medicines */}
      {renderSection('current_meds', 'Current General Medicines', formData.currentMedications.hasMedications === null ? false : (formData.currentMedications.hasMedications ? !!formData.currentMedications.details : true), (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Are you taking any general medicines on your own?</p>
          <div className="flex gap-2">
            <Button type="button" variant={formData.currentMedications.hasMedications === true ? "default" : "outline"} size="sm" onClick={() => setFormData(p => ({ ...p, currentMedications: { ...p.currentMedications, hasMedications: true } }))}>Yes</Button>
            <Button type="button" variant={formData.currentMedications.hasMedications === false ? "default" : "outline"} size="sm" onClick={() => { setFormData(p => ({ ...p, currentMedications: { hasMedications: false, details: '' } })); advanceTo('allergies'); }}>No</Button>
          </div>
          {formData.currentMedications.hasMedications && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <Textarea 
                placeholder="Please detail medicines you are taking" 
                value={formData.currentMedications.details}
                onChange={(e) => setFormData(p => ({ ...p, currentMedications: { ...p.currentMedications, details: e.target.value } }))}
                className="resize-none h-16 mt-2"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => advanceTo('allergies')}>Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 6. Allergies */}
      {renderSection('allergies', 'Allergies', formData.allergies.hasAllergies === null ? false : (formData.allergies.hasAllergies ? !!formData.allergies.details : true), (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Any allergies to food or medicines?</p>
          <div className="flex gap-2">
            <Button type="button" variant={formData.allergies.hasAllergies === true ? "default" : "outline"} size="sm" onClick={() => setFormData(p => ({ ...p, allergies: { ...p.allergies, hasAllergies: true } }))}>Yes</Button>
            <Button type="button" variant={formData.allergies.hasAllergies === false ? "default" : "outline"} size="sm" onClick={() => { setFormData(p => ({ ...p, allergies: { hasAllergies: false, details: '' } })); advanceTo('family_history'); }}>No</Button>
          </div>
          {formData.allergies.hasAllergies && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <Textarea 
                placeholder="Specify allergies" 
                value={formData.allergies.details}
                onChange={(e) => setFormData(p => ({ ...p, allergies: { ...p.allergies, details: e.target.value } }))}
                className="resize-none h-16 mt-2"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => advanceTo('family_history')}>Next <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 7. Family History */}
      {renderSection('family_history', 'Family History (Optional)', formData.familyHistory.hasHistory === null ? false : (formData.familyHistory.hasHistory ? !!formData.familyHistory.details : true), (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Any serious diseases in the family? (e.g. Heart disease)</p>
          <div className="flex gap-2">
            <Button type="button" variant={formData.familyHistory.hasHistory === true ? "default" : "outline"} size="sm" onClick={() => setFormData(p => ({ ...p, familyHistory: { ...p.familyHistory, hasHistory: true } }))}>Yes</Button>
            <Button type="button" variant={formData.familyHistory.hasHistory === false ? "default" : "outline"} size="sm" onClick={() => { setFormData(p => ({ ...p, familyHistory: { hasHistory: false, details: '' } })); setActiveSection(null); }}>No</Button>
          </div>
          {formData.familyHistory.hasHistory && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <Textarea 
                placeholder="Specify family history" 
                value={formData.familyHistory.details}
                onChange={(e) => setFormData(p => ({ ...p, familyHistory: { ...p.familyHistory, details: e.target.value } }))}
                className="resize-none h-16 mt-2"
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setActiveSection(null)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      ))}

    </div>
  );
}