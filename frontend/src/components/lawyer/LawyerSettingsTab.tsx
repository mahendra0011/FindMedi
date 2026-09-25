import React from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface LawyerSettingsTabProps {
  handleSaveSettings: (e: React.FormEvent) => Promise<void>;
  acceptsUrgent: boolean;
  setAcceptsUrgent: (val: boolean) => void;
  editEmergencyStandby: boolean;
  setEditEmergencyStandby: (val: boolean) => void;
  editRefundPolicy: string;
  setEditRefundPolicy: (val: string) => void;
  editFeeSchedule: {
    video30m: number;
    chamberVisit: number;
    bedsideVisit: number;
    noticeDrafting: number;
  };
  setEditFeeSchedule: React.Dispatch<
    React.SetStateAction<{
      video30m: number;
      chamberVisit: number;
      bedsideVisit: number;
      noticeDrafting: number;
    }>
  >;
  editPracticingCourts: string[];
  setEditPracticingCourts: React.Dispatch<React.SetStateAction<string[]>>;
  courtInput: string;
  setCourtInput: (val: string) => void;
  editPrivilegeLocked: boolean;
  setEditPrivilegeLocked: (val: boolean) => void;
  bankHolder: string;
  setBankHolder: (val: string) => void;
  bankAccount: string;
  setBankAccount: (val: string) => void;
  bankIfsc: string;
  setBankIfsc: (val: string) => void;
  bankUpi: string;
  setBankUpi: (val: string) => void;
  bankGstin: string;
  setBankGstin: (val: string) => void;
  profile: any;
  savingSettings: boolean;
}

export const LawyerSettingsTab: React.FC<LawyerSettingsTabProps> = ({
  handleSaveSettings,
  acceptsUrgent,
  setAcceptsUrgent,
  editEmergencyStandby,
  setEditEmergencyStandby,
  editRefundPolicy,
  setEditRefundPolicy,
  editFeeSchedule,
  setEditFeeSchedule,
  editPracticingCourts,
  setEditPracticingCourts,
  courtInput,
  setCourtInput,
  editPrivilegeLocked,
  setEditPrivilegeLocked,
  bankHolder,
  setBankHolder,
  bankAccount,
  setBankAccount,
  bankIfsc,
  setBankIfsc,
  bankUpi,
  setBankUpi,
  bankGstin,
  setBankGstin,
  profile,
  savingSettings,
}) => {
  return (
    <form
      onSubmit={handleSaveSettings}
      className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
    >
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
        Consultation Availability & Bank Payout Settings
      </h3>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
            Accept Urgent / Emergency Requests
          </div>
          <div className="text-[11px] text-slate-500">
            Receive broadcast requests for immediate 1-hour legal assistance.
          </div>
        </div>
        <input
          type="checkbox"
          checked={acceptsUrgent}
          onChange={(e) => setAcceptsUrgent(e.target.checked)}
          className="w-5 h-5 rounded text-slate-900 dark:text-slate-100"
        />
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
            Emergency medico-legal / bail standby
          </div>
          <div className="text-[11px] text-slate-500">
            Distressed families facing detention or MLC FIR can find you on standby.
          </div>
        </div>
        <input
          type="checkbox"
          checked={editEmergencyStandby}
          onChange={(e) => setEditEmergencyStandby(e.target.checked)}
          className="w-5 h-5 rounded"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Court-conflict reschedule & refund policy
        </label>
        <select
          value={editRefundPolicy}
          onChange={(e) => setEditRefundPolicy(e.target.value)}
          className="h-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 w-full"
        >
          <option value="lawyer_cancels_full">100% refund if lawyer cancels</option>
          <option value="court_clash_reschedule">Free priority reschedule on court clash</option>
          <option value="client_12h_full">100% refund on client cancel &gt;12h before</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Legal fee schedule (₹)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['video30m', '30m Video Advisory'],
              ['chamberVisit', 'Chamber Visit'],
              ['bedsideVisit', 'Hospital Bedside Visit'],
              ['noticeDrafting', 'Legal Notice Drafting'],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-[11px] text-slate-500 mb-1">{label}</label>
              <Input
                type="number"
                min={0}
                value={editFeeSchedule[key]}
                onChange={(e) =>
                  setEditFeeSchedule({ ...editFeeSchedule, [key]: Number(e.target.value) })
                }
                className="rounded-xl text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Primary practicing courts
        </label>
        <div className="flex flex-wrap gap-2">
          {editPracticingCourts.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                setEditPracticingCourts(editPracticingCourts.filter((x) => x !== c))
              }
              className="px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold"
              title="Remove"
            >
              {c} ✕
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={courtInput}
            onChange={(e) => setCourtInput(e.target.value)}
            placeholder="e.g. Supreme Court, High Court of MP, NCDRC"
            className="rounded-xl text-xs"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const v = courtInput.trim();
              if (v && !editPracticingCourts.includes(v))
                setEditPracticingCourts([...editPracticingCourts, v].slice(0, 10));
              setCourtInput('');
            }}
            className="text-xs shrink-0"
          >
            Add
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div>
          <div className="font-bold text-xs text-slate-900 dark:text-slate-100">
            Client-attorney privilege lock
          </div>
          <div className="text-[11px] text-slate-500">
            Health records shared by the patient stay encrypted under privilege.
          </div>
        </div>
        <input
          type="checkbox"
          checked={editPrivilegeLocked}
          onChange={(e) => setEditPrivilegeLocked(e.target.checked)}
          className="w-5 h-5 rounded"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Account Holder Name
          </label>
          <Input
            type="text"
            value={bankHolder}
            onChange={(e) => setBankHolder(e.target.value)}
            className="rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Bank Account Number
          </label>
          <Input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            className="rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            IFSC Code
          </label>
          <Input
            type="text"
            value={bankIfsc}
            onChange={(e) => setBankIfsc(e.target.value)}
            className="rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            UPI ID (Optional)
          </label>
          <Input
            type="text"
            placeholder="name@upi"
            value={bankUpi}
            onChange={(e) => setBankUpi(e.target.value)}
            className="rounded-xl text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            GSTIN (for fee invoices)
          </label>
          <Input
            type="text"
            placeholder="e.g. 23ABCDE1234F1Z5"
            value={bankGstin}
            onChange={(e) => setBankGstin(e.target.value.toUpperCase())}
            className="rounded-xl text-xs"
          />
        </div>
      </div>
      {profile?.bankDetails?.verified && (
        <p className="text-[11px] font-bold text-emerald-600">✓ Settlement account verified by admin</p>
      )}

      <div className="flex justify-end pt-3">
        <Button
          type="submit"
          disabled={savingSettings}
          className="bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl"
        >
          {savingSettings ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
};
