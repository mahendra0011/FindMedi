import React, { useState } from 'react';
import { FileText, Clock, Plus, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface CaseNoteItem {
  _id?: string;
  authorRole?: string;
  note: string;
  createdAt: string;
}

interface Props {
  notes: CaseNoteItem[];
  isLawyer?: boolean;
  onAddNote?: (note: string) => Promise<void>;
  finalSummary?: string;
}

export const CaseNotesView: React.FC<Props> = ({
  notes = [],
  isLawyer = false,
  onAddNote,
  finalSummary,
}) => {
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !onAddNote) return;
    try {
      setSaving(true);
      await onAddNote(newNote.trim());
      setNewNote('');
    } catch (err: any) {
      alert(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Legal Case Notes & Advisory Record
            </h4>
            <p className="text-[11px] text-slate-500">
              Live consultation notes, medical record review, and legal action steps
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] gap-1 font-mono">
          <ShieldAlert className="w-3 h-3 text-amber-500" />
          Privileged & Confidential
        </Badge>
      </div>

      {/* Final Case Summary (if completed) */}
      {finalSummary && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Final Legal Case Summary & Next Steps
          </div>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
            {finalSummary}
          </p>
        </div>
      )}

      {/* Lawyer Note Input (Only if isLawyer) */}
      {isLawyer && onAddNote && (
        <form onSubmit={handleSave} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
          <textarea
            rows={3}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type live case observation, relevant medical law precedent, documents needed, or advice given..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-slate-100"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving || !newNote.trim()}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Add Case Note'}
            </Button>
          </div>
        </form>
      )}

      {/* Notes Stream */}
      {notes.length === 0 && !finalSummary ? (
        <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
          No case notes recorded yet. Advocate will log notes during consultation.
        </div>
      ) : (
        <div className="space-y-2.5">
          {notes.map((note, index) => (
            <div
              key={note._id || index}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm space-y-1.5 text-xs animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  Advocate Case Note #{index + 1}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {note.createdAt ? new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                </span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {note.note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
