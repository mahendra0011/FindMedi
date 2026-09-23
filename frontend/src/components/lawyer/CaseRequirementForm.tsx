import React, { useState } from 'react';
import {
  Video,
  Phone,
  UserCheck,
  MessageSquare,
  Zap,
  Calendar,
  Clock,
  IndianRupee,
  FileText,
  UploadCloud,
  X,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { LEGAL_CATEGORIES } from './LegalCategorySelector';

export interface CaseRequirementData {
  category: string;
  caseDescription: string;
  urgency: 'normal' | 'urgent';
  consultationMode: 'video' | 'phone' | 'in_person' | 'chat';
  scheduledDate: string;
  startTime: string;
  budgetMin?: number;
  budgetMax?: number;
  documents: string[];
}

interface Props {
  selectedCategory: string;
  onBackToCategory: () => void;
  onSubmit: (data: CaseRequirementData) => void;
  loading?: boolean;
}

const CONSULTATION_MODES = [
  { id: 'video', label: 'Online Video Call', icon: Video, desc: 'Face-to-face video consultation' },
  { id: 'phone', label: 'Phone Call', icon: Phone, desc: 'Direct phone advisory' },
  { id: 'in_person', label: 'In-Person Chamber', icon: UserCheck, desc: 'Chamber / Hospital visit' },
  { id: 'chat', label: 'In-App Chat Only', icon: MessageSquare, desc: 'Text consultation & vetting' },
];

export const CaseRequirementForm: React.FC<Props> = ({
  selectedCategory,
  onBackToCategory,
  onSubmit,
  loading = false,
}) => {
  const currentCategory = LEGAL_CATEGORIES.find((c) => c.code === selectedCategory);

  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [mode, setMode] = useState<'video' | 'phone' | 'in_person' | 'chat'>('video');
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('11:00');
  const [budgetMin, setBudgetMin] = useState<number | ''>('');
  const [budgetMax, setBudgetMax] = useState<number | ''>('');
  const [documentInput, setDocumentInput] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);

  const handleAddDocument = () => {
    if (!documentInput.trim()) return;
    setDocuments((prev) => [...prev, documentInput.trim()]);
    setDocumentInput('');
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Please provide a brief description of your legal requirement or issue.');
      return;
    }
    onSubmit({
      category: selectedCategory,
      caseDescription: description.trim(),
      urgency,
      consultationMode: mode,
      scheduledDate,
      startTime,
      budgetMin: budgetMin === '' ? undefined : Number(budgetMin),
      budgetMax: budgetMax === '' ? undefined : Number(budgetMax),
      documents,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category Pill Banner */}
      <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/10 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
            {currentCategory?.icon ? (
              <currentCategory.icon className="w-5 h-5" />
            ) : (
              '⚖️'
            )}
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Selected Legal Category
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              {currentCategory?.name || selectedCategory}
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBackToCategory}
          className="text-xs rounded-xl"
        >
          Change Category
        </Button>
      </div>

      {/* Case Description */}
      <div>
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
          Brief Description of Your Legal Matter / Issue <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="E.g., Doctor did not disclose surgical complication, ICU bill has inflated charges, insurance company rejected reimbursement claim, need help drafting police FIR for accident..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 dark:focus:border-white dark:text-slate-100 placeholder:text-slate-400"
          required
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Strictly confidential. Shared only with your assigned advocate.
        </p>
      </div>

      {/* Urgency Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
          Urgency Level
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setUrgency('normal')}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
              urgency === 'normal'
                ? 'border-slate-900 dark:border-white bg-slate-100/40 dark:bg-white/10 ring-1 ring-slate-900 dark:ring-white'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-5 h-5 text-slate-900 dark:text-slate-100 mt-0.5" />
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
                Scheduled Consultation
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Book for a convenient date & time slot
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setUrgency('urgent')}
            className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
              urgency === 'urgent'
                ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 ring-1 ring-rose-500'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <Zap className="w-5 h-5 text-rose-600 mt-0.5 animate-pulse" />
            <div>
              <div className="font-bold text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                Urgent Legal Help (Within 1 Hour)
                <span className="text-[9px] px-1.5 py-0.2 bg-rose-600 text-white rounded-full uppercase font-bold">
                  Fast
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Broadcasts instantly to all available advocates in this category
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Preferred Consultation Mode */}
      <div>
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
          Preferred Consultation Mode <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CONSULTATION_MODES.map((m) => {
            const Icon = m.icon;
            const isSelected = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as any)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'border-slate-900 dark:border-white bg-slate-100/50 dark:bg-white/10 ring-1 ring-slate-900 dark:ring-white'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isSelected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'
                  }`}
                />
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date & Time (Only if Normal urgency) */}
      {urgency === 'normal' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" />
              Consultation Date
            </label>
            <Input
              type="date"
              value={scheduledDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" />
              Preferred Time Slot
            </label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-xl text-xs"
              required
            />
          </div>
        </div>
      )}

      {/* Budget Range (Optional) */}
      <div>
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
          <IndianRupee className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" />
          Budget Range (Optional)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={0}
            step={100}
            placeholder="Min Budget (₹)"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value === '' ? '' : Number(e.target.value))}
            className="rounded-xl text-xs"
          />
          <Input
            type="number"
            min={0}
            step={100}
            placeholder="Max Budget (₹)"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value === '' ? '' : Number(e.target.value))}
            className="rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Upload Relevant Documents (Reports, Bills, FIR) */}
      <div>
        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-900 dark:text-slate-100" />
          Attach Relevant Documents / Reference Files (Optional)
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="E.g., Discharge Summary.pdf, FIR Copy, Treatment Bill #492"
            value={documentInput}
            onChange={(e) => setDocumentInput(e.target.value)}
            className="rounded-xl text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddDocument();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleAddDocument}
            variant="outline"
            className="rounded-xl text-xs shrink-0"
          >
            + Add
          </Button>
        </div>

        {documents.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {documents.map((doc, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="px-2.5 py-1 text-xs gap-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              >
                <FileText className="w-3 h-3" />
                <span>{doc}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDocument(idx)}
                  className="hover:text-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Form Action */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onBackToCategory}
          className="text-xs"
        >
          ← Back to Categories
        </Button>

        <Button
          type="submit"
          disabled={loading}
          className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md gap-1.5 px-6"
        >
          {loading ? 'Searching Advocates...' : 'Find Matching Lawyers →'}
        </Button>
      </div>
    </form>
  );
};
