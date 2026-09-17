'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}

export interface PrescriptionFormData {
  patientName: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  doctorName: string;
  specialization: string;
  chiefComplaints: string;
  diagnosis: string;
  medications: MedicationItem[];
  advice: string;
  followUp: string;
}

export interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PrescriptionFormData) => void;
  initialData?: Partial<PrescriptionFormData>;
}

export default function PrescriptionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: PrescriptionModalProps) {
  const [formData, setFormData] = useState<PrescriptionFormData>({
    patientName: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    doctorName: '',
    specialization: '',
    chiefComplaints: '',
    diagnosis: '',
    medications: [{ name: '', dosage: '', frequency: '', instructions: '' }],
    advice: '',
    followUp: '',
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        medications: initialData.medications && initialData.medications.length > 0
          ? initialData.medications
          : prev.medications,
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
        <h3 className="font-heading text-lg font-bold text-foreground mb-4">Create New Prescription</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Patient Name</label>
              <Input
                value={formData.patientName}
                onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                placeholder="Enter patient name"
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
                placeholder="Email"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Chief Complaints</label>
            <Input
              value={formData.chiefComplaints}
              onChange={e => setFormData({ ...formData, chiefComplaints: e.target.value })}
              placeholder="Enter chief complaints"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Diagnosis</label>
            <Input
              value={formData.diagnosis}
              onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="Enter diagnosis"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Medications</label>
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
                  className="w-28"
                />
                <Input
                  value={med.instructions}
                  onChange={e => updateMedication(idx, 'instructions', e.target.value)}
                  placeholder="Instructions"
                  className="flex-1"
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
            <label className="text-sm font-medium text-foreground mb-1.5 block">Advice</label>
            <Input
              value={formData.advice}
              onChange={e => setFormData({ ...formData, advice: e.target.value })}
              placeholder="Advice for patient"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Follow-up</label>
            <Input
              value={formData.followUp}
              onChange={e => setFormData({ ...formData, followUp: e.target.value })}
              placeholder="Follow-up date"
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
