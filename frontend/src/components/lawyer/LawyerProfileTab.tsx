import React from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface LawyerProfileTabProps {
  handleSaveProfile: (e: React.FormEvent) => Promise<void>;
  editBio: string;
  setEditBio: (val: string) => void;
  editFee: number;
  setEditFee: (val: number) => void;
  editFollowUpFee: number;
  setEditFollowUpFee: (val: number) => void;
  editDuration: number;
  setEditDuration: (val: number) => void;
  savingProfile: boolean;
}

export const LawyerProfileTab: React.FC<LawyerProfileTabProps> = ({
  handleSaveProfile,
  editBio,
  setEditBio,
  editFee,
  setEditFee,
  editFollowUpFee,
  setEditFollowUpFee,
  editDuration,
  setEditDuration,
  savingProfile,
}) => {
  return (
    <form
      onSubmit={handleSaveProfile}
      className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
    >
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
        Practice Profile & Consultation Rates
      </h3>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Bio & Practice Experience
        </label>
        <textarea
          rows={3}
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Consultation Fee (₹ per session)
          </label>
          <Input
            type="number"
            min={100}
            step={50}
            value={editFee}
            onChange={(e) => setEditFee(Number(e.target.value))}
            className="rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Follow-Up Session Fee (₹)
          </label>
          <Input
            type="number"
            min={100}
            step={50}
            value={editFollowUpFee}
            onChange={(e) => setEditFollowUpFee(Number(e.target.value))}
            className="rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Typical Duration (Minutes)
          </label>
          <select
            value={editDuration}
            onChange={(e) => setEditDuration(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
          >
            <option value={15}>15 Minutes</option>
            <option value={30}>30 Minutes</option>
            <option value={45}>45 Minutes</option>
            <option value={60}>60 Minutes</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-3">
        <Button
          type="submit"
          disabled={savingProfile}
          className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl"
        >
          {savingProfile ? 'Saving...' : 'Save Profile Details'}
        </Button>
      </div>
    </form>
  );
};
