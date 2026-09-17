'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MedicationItem } from './PrescriptionModal';

export interface DischargeFormData {
  patientName: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  doctorName: string;
  specialization: string;
  admissionId: string;
  admissionDate: string;
  dischargeDate: string;
  chiefComplaints: string;
  diagnosis: string;
  treatmentGiven: string;
  surgery: string;
  medications: MedicationItem[];
  dischargeAdvice: string;
  followUpInstructions: string;
}

export interface DischargeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DischargeFormData) => void;
  initialData?: Partial<DischargeFormData>;
}

export default function DischargeSummaryModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: DischargeSummaryModalProps) {
  const [formData, setFormData] = useState<DischargeFormData>({
    patientName: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    doctorName: '',
    specialization: '',
    admissionId: '',
    admissionDate: '',
    dischargeDate: '',
    chiefComplaints: '',
    diagnosis: '',
    treatmentGiven: '',
    surgery: '',
    medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
    dischargeAdvice: '',
    followUpInstructions: '',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        medications: initialData.medications && initialData.medications.length > 0 ? initialData.medications : prev.medications,
      }));
    }
  }, [initialData]);

  if (!isOpen) return null;

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dosage: '', frequency: '', instructions: '' }],
    }));
  };

  const removeMedication = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== idx),
    }));
  };

  const updateMedication = (idx: number, field: keyof MedicationItem, value: string) => {
    setFormData(prev => {
      const meds = [...prev.medications];
      const item = meds[idx];
      if (item) {
        meds[idx] = { ...item, [field]: value };
      }
      return { ...prev, medications: meds };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-heading text-lg font-bold text-foreground mb-4">Discharge Summary</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name</label>
              <Input
                value={formData.patientName}
                onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                placeholder="Patient name"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Age</label>
                <Input
                  type="number"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                  placeholder="Age"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                >
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
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Address</label>
            <Input
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Residential address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Admission ID</label>
              <Input
                value={formData.admissionId}
                onChange={e => setFormData({ ...formData, admissionId: e.target.value })}
                placeholder="ADM-XXXX"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Admission Date</label>
              <Input
                type="date"
                value={formData.admissionDate}
                onChange={e => setFormData({ ...formData, admissionDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Discharge Date</label>
              <Input
                type="date"
                value={formData.dischargeDate}
                onChange={e => setFormData({ ...formData, dischargeDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label>
            <Input
              value={formData.chiefComplaints}
              onChange={e => setFormData({ ...formData, chiefComplaints: e.target.value })}
              placeholder="Chief complaints"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis</label>
            <Input
              value={formData.diagnosis}
              onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="Primary diagnosis"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Treatment Given</label>
            <Input
              value={formData.treatmentGiven}
              onChange={e => setFormData({ ...formData, treatmentGiven: e.target.value })}
              placeholder="Treatment given"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Surgery (if any)</label>
            <Input
              value={formData.surgery}
              onChange={e => setFormData({ ...formData, surgery: e.target.value })}
              placeholder="Surgical procedure details"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Discharge Medications</label>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={addMedication}>
                <Plus className="w-3 h-3" /> Add Medication
              </Button>
            </div>
            {formData.medications.map((med, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-start">
                <Input
                  value={med.name}
                  onChange={e => updateMedication(idx, 'name', e.target.value)}
                  placeholder="Medicine name"
                  className="flex-1"
                />
                <Input
                  value={med.dosage}
                  onChange={e => updateMedication(idx, 'dosage', e.target.value)}
                  placeholder="Dosage"
                  className="w-24"
                />
                <Input
                  value={med.frequency}
                  onChange={e => updateMedication(idx, 'frequency', e.target.value)}
                  placeholder="Frequency"
                  className="w-24"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={() => removeMedication(idx)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Discharge Advice</label>
            <Input
              value={formData.dischargeAdvice}
              onChange={e => setFormData({ ...formData, dischargeAdvice: e.target.value })}
              placeholder="Advice on discharge"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up Instructions</label>
            <Input
              value={formData.followUpInstructions}
              onChange={e => setFormData({ ...formData, followUpInstructions: e.target.value })}
              placeholder="Follow-up instructions"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => onSubmit(formData)}
            disabled={!formData.diagnosis}
          >
            <Send className="w-4 h-4" /> Generate &amp; Send
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
