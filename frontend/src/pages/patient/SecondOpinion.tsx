// subcatogary.md P1-3: Patient Second Opinion Create & History UI
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Stethoscope, HelpCircle, Send, CheckCircle2, AlertCircle, Clock, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { api } from '@/lib/api';
import { CANONICAL_SPECIALTIES } from '@/data/specialties';
import { useSpecialtyTiles } from '@/hooks/useSpecialtyBrowse';

export default function SecondOpinion() {
  // Specialty codes come from the live taxonomy (43 top-level tiles); the
  // canonical copy only backs the offline fallback.
  const { tiles } = useSpecialtyTiles();
  const specialtyOptions = tiles.length
    ? tiles.map(t => ({ code: t.code, name: t.name }))
    : CANONICAL_SPECIALTIES.map(s => ({ code: s.code, name: s.name }));

  const [tab, setTab] = useState<'create' | 'history'>('create');
  const [records, setRecords] = useState<any[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Load patient's medical records
    api.getRecords()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.records || res?.data || []);
        setRecords(list);
      })
      .catch(() => {});

    // Load available doctors
    api.getDoctors({ limit: 50 })
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.doctors || []);
        setDoctors(list);
      })
      .catch(() => {});
  }, []);

  const loadHistory = () => {
    setLoadingHistory(true);
    api.getMySecondOpinions()
      .then((res: any) => {
        setHistory(res?.requests || []);
      })
      .catch(() => toast.error('Failed to load second opinion history'))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const toggleRecord = (id: string) => {
    setSelectedRecordIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const filteredDoctors = doctors.filter(d => {
    if (!selectedSpecialty) return true;
    return (d.specialtyCode === selectedSpecialty) ||
      (d.specialization && d.specialization.toLowerCase().includes(selectedSpecialty.toLowerCase()));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      toast.error('Please select a specialist doctor');
      return;
    }
    if (selectedRecordIds.length === 0) {
      toast.error('Please select at least one medical record to share');
      return;
    }
    if (question.trim().length < 10) {
      toast.error('Question must be at least 10 characters long');
      return;
    }

    setLoading(true);
    try {
      await api.createSecondOpinion({
        doctorId: selectedDoctorId,
        recordIds: selectedRecordIds,
        question: question.trim(),
      });
      toast.success('Second opinion request submitted successfully!');
      setQuestion('');
      setSelectedRecordIds([]);
      setSelectedDoctorId('');
      setTab('history');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    try {
      await api.cancelSecondOpinion(id);
      toast.success('Request cancelled');
      loadHistory();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Specialist Second Opinion</h1>
          <p className="text-sm text-muted-foreground">Share medical records and get expert medical reviews from verified specialists</p>
        </div>
        <div className="flex bg-muted rounded-xl p-1 shrink-0">
          <button
            onClick={() => setTab('create')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              tab === 'create' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            New Request
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              tab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Requests
          </button>
        </div>
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Filter & Choose Doctor */}
          <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Stethoscope className="w-4 h-4 text-primary" /> 1. Select Specialist Doctor
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Filter by Specialty</label>
                <select
                  value={selectedSpecialty}
                  onChange={e => setSelectedSpecialty(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">All Specialties ({specialtyOptions.length})</option>
                  {specialtyOptions.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Doctor *</label>
                <select
                  value={selectedDoctorId}
                  onChange={e => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-xl px-3 py-2 text-sm"
                  required
                >
                  <option value="">Choose a doctor...</option>
                  {filteredDoctors.map(d => (
                    <option key={d._id} value={d._id}>
                      Dr. {d.name} ({d.specialization || d.specialtyCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2: Select Records */}
          <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" /> 2. Select Medical Records to Share *
              </h2>
              <span className="text-xs text-muted-foreground">
                {selectedRecordIds.length} record(s) selected
              </span>
            </div>

            {records.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground bg-muted/40 rounded-xl text-xs">
                No medical records found in your account. Please upload or link a prescription/report first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {records.map(r => {
                  const isSelected = selectedRecordIds.includes(r._id);
                  return (
                    <div
                      key={r._id}
                      onClick={() => toggleRecord(r._id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border/60 bg-background text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-border"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{r.title || r.diagnosis || r.type || 'Medical Record'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.type} • {r.date ? new Date(r.date).toLocaleDateString('en-IN') : 'Recent'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Question / Reason */}
          <div className="bg-card rounded-2xl border border-border/60 p-5 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <HelpCircle className="w-4 h-4 text-primary" /> 3. Your Specific Question or Concern *
            </h2>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Describe your current diagnosis, symptoms, or what specific guidance you are seeking from the specialist..."
              rows={4}
              className="w-full bg-background border border-border/60 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              ABDM Consent Notice: Your chosen medical records will be temporarily shared under a 30-day time-bounded consent token solely for this consultation review.
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto gap-2">
            <Send className="w-4 h-4" />
            {loading ? 'Submitting...' : 'Submit Second Opinion Request'}
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border/60 p-12 text-center text-muted-foreground">
              <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium text-foreground">No second opinion requests yet</p>
              <p className="text-xs mt-1">Submit a request to get expert advice from leading specialists</p>
            </div>
          ) : (
            history.map(req => (
              <div key={req.id} className="bg-card rounded-2xl border border-border/60 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        Dr. {req.doctor?.name || 'Specialist'}
                      </span>
                      {req.doctor?.specialization && (
                        <span className="text-xs text-muted-foreground">({req.doctor.specialization})</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Requested on {new Date(req.createdAt).toLocaleDateString('en-IN')} • {req.recordIds?.length || 0} record(s) shared
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                      req.status === 'ANSWERED' ? 'bg-emerald-500/10 text-emerald-600' :
                      req.status === 'REQUESTED' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {req.status}
                    </span>
                    {req.status === 'REQUESTED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(req.id)}
                        className="text-xs text-destructive hover:bg-destructive/10 h-7 px-2"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-muted/40 rounded-xl p-3 text-xs text-foreground">
                  <span className="font-medium text-muted-foreground block mb-0.5">Your Question:</span>
                  {req.question}
                </div>

                {req.answer?.text && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-xs text-foreground space-y-1">
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Specialist's Opinion:
                    </span>
                    <p className="whitespace-pre-wrap">{req.answer.text}</p>
                    {req.answer.answeredAt && (
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        Answered on {new Date(req.answer.answeredAt).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
