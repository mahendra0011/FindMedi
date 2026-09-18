'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface LabReportTestItem {
  name: string;
  result: string;
  unit: string;
  referenceRange: string;
}

export interface LabReportFormData {
  patientName: string;
  age: string;
  gender: string;
  phone: string;
  email: string;
  doctorName: string;
  specialization: string;
  reportId: string;
  testDate: string;
  reportDate: string;
  tests: LabReportTestItem[];
  notes: string;
}

export interface LabReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LabReportFormData) => void;
  initialData?: Partial<LabReportFormData>;
}

export default function LabReportModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: LabReportModalProps) {
  const [formData, setFormData] = useState<LabReportFormData>({
    patientName: '',
    age: '',
    gender: '',
    phone: '',
    email: '',
    doctorName: '',
    specialization: '',
    reportId: '',
    testDate: '',
    reportDate: '',
    tests: [{ name: '', result: '', unit: '', referenceRange: '' }],
    notes: '',
    ...initialData,
  });

  const [prevInitial, setPrevInitial] = useState(initialData);
  if (prevInitial !== initialData) {
    setPrevInitial(initialData);
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        tests: initialData.tests && initialData.tests.length > 0 ? initialData.tests : prev.tests,
      }));
    }
  }

  if (!isOpen) return null;

  const addTest = () => {
    setFormData(prev => ({
      ...prev,
      tests: [...prev.tests, { name: '', result: '', unit: '', referenceRange: '' }],
    }));
  };

  const removeTest = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      tests: prev.tests.filter((_, i) => i !== idx),
    }));
  };

  const updateTest = (idx: number, field: keyof LabReportTestItem, value: string) => {
    setFormData(prev => {
      const tests = [...prev.tests];
      const item = tests[idx];
      if (item) {
        tests[idx] = { ...item, [field]: value };
      }
      return { ...prev, tests };
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
        <h3 className="font-heading text-lg font-bold text-foreground mb-4">Generate Lab Report</h3>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Report ID</label>
              <Input
                value={formData.reportId}
                onChange={e => setFormData({ ...formData, reportId: e.target.value })}
                placeholder="LAB-XXXXX"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Test Date</label>
                <Input
                  type="date"
                  value={formData.testDate}
                  onChange={e => setFormData({ ...formData, testDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Report Date</label>
                <Input
                  type="date"
                  value={formData.reportDate}
                  onChange={e => setFormData({ ...formData, reportDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Tests</label>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={addTest}>
                <Plus className="w-3 h-3" /> Add Test
              </Button>
            </div>
            {formData.tests.map((t, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-start">
                <Input
                  value={t.name}
                  onChange={e => updateTest(idx, 'name', e.target.value)}
                  placeholder="Test name"
                  className="flex-1"
                />
                <Input
                  value={t.result}
                  onChange={e => updateTest(idx, 'result', e.target.value)}
                  placeholder="Result"
                  className="w-20"
                />
                <Input
                  value={t.unit}
                  onChange={e => updateTest(idx, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="w-20"
                />
                <Input
                  value={t.referenceRange}
                  onChange={e => updateTest(idx, 'referenceRange', e.target.value)}
                  placeholder="Ref range"
                  className="w-24"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={() => removeTest(idx)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Notes</label>
            <Input
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
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
            disabled={!formData.reportId}
          >
            <Send className="w-4 h-4" /> Generate &amp; Send
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
