import React from 'react';
import { UserCheck, CheckCircle2, MapPin, X, Plus, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export const PRESET_SERVICE_AREAS = [
  'Jabalpur',
  'Delhi NCR',
  'Bhopal',
  'Indore',
  'Mumbai',
  'Pune',
  'Bangalore',
  'Hyderabad',
  'Chennai',
  'Lucknow',
  'Kolkata',
  'Ahmedabad',
];

export const SERVICE_CATEGORIES = [
  { id: 'paperwork', label: 'Hospital Paperwork & OPD Queues', icon: '📋' },
  { id: 'medicine', label: 'Pharmacy & Medicine Collection', icon: '💊' },
  { id: 'reports', label: 'Lab Sample & Diagnostic Reports', icon: '🧪' },
  { id: 'errand', label: 'In-Campus Hospital Errands', icon: '🏃' },
  { id: 'full_attendant', label: 'Bedside & Ward Attendant', icon: '🏥' },
  { id: 'elderly_care', label: 'Elderly & Wheelchair Mobility Care', icon: '👴' },
];

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface AssistantProfileTabProps {
  handleSaveProfile: (e: React.FormEvent) => Promise<void>;
  savingProfile: boolean;
  profileSuccessMsg: string;
  editBio: string;
  setEditBio: (bio: string) => void;
  editPricePerHour: number;
  setEditPricePerHour: (price: number) => void;
  editPricePerFullDay: number;
  setEditPricePerFullDay: (price: number) => void;
  editHospitals: string[];
  setEditHospitals: (hospitals: string[]) => void;
  customHospital: string;
  setCustomHospital: (val: string) => void;
  editCategories: string[];
  setEditCategories: (cats: string[]) => void;
  editAvailableDays: string[];
  setEditAvailableDays: (days: string[]) => void;
  editBankDetails: {
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    upiId: string;
  };
  setEditBankDetails: (details: any) => void;
  profile: any;
  editEmergencyStandby: boolean;
  setEditEmergencyStandby: (val: boolean) => void;
  editRefundPolicy: string;
  setEditRefundPolicy: (val: string) => void;
  editRateCard: {
    halfDay4h: number;
    day8h: number;
    night12h: number;
    full24h: number;
  };
  setEditRateCard: (val: any) => void;
  editClinicalTags: string[];
  setEditClinicalTags: (tags: string[]) => void;
  clinicalTagInput: string;
  setClinicalTagInput: (val: string) => void;
  editPreferredHospitals: string[];
}

export const AssistantProfileTab: React.FC<AssistantProfileTabProps> = ({
  handleSaveProfile,
  savingProfile,
  profileSuccessMsg,
  editBio,
  setEditBio,
  editPricePerHour,
  setEditPricePerHour,
  editPricePerFullDay,
  setEditPricePerFullDay,
  editHospitals,
  setEditHospitals,
  customHospital,
  setCustomHospital,
  editCategories,
  setEditCategories,
  editAvailableDays,
  setEditAvailableDays,
  editBankDetails,
  setEditBankDetails,
  profile,
  editEmergencyStandby,
  setEditEmergencyStandby,
  editRefundPolicy,
  setEditRefundPolicy,
  editRateCard,
  setEditRateCard,
  editClinicalTags,
  setEditClinicalTags,
  clinicalTagInput,
  setClinicalTagInput,
  editPreferredHospitals,
}) => {
  return (
    <form
      onSubmit={handleSaveProfile}
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-600" />
            Attendant Profile, Rates & Service Preferences
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your hourly rates, service areas, care categories, and banking credentials
          </p>
        </div>

        <Button
          type="submit"
          disabled={savingProfile}
          className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-6 h-10 rounded-2xl shadow-md shadow-teal-600/20"
        >
          {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
        </Button>
      </div>

      {profileSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {/* Section 1: Pricing & Rates */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          1. Service Pricing & Packages
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Hourly Assistance Rate (₹ / hr) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <Input
                type="number"
                value={editPricePerHour}
                onChange={(e) => setEditPricePerHour(Number(e.target.value))}
                min={50}
                max={2000}
                required
                className="pl-8 h-10 text-xs font-bold rounded-xl"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Recommended: ₹150 - ₹300/hr for OPD & paperwork assistance
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Day Package (8-10 Hours) (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">₹</span>
              <Input
                type="number"
                value={editPricePerFullDay}
                onChange={(e) => setEditPricePerFullDay(Number(e.target.value))}
                min={300}
                max={10000}
                required
                className="pl-8 h-10 text-xs font-bold rounded-xl"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Discounted package rate for full day or surgery support
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Bio & Patient Pitch */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          2. Professional Introduction & Bio
        </h4>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            About You & Care Approach (Displayed to Patients) *
          </label>
          <textarea
            rows={3}
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
            maxLength={400}
            required
            placeholder="Tell patients about your hospital experience, familiarity with doctors and billing counters, and compassionate patient care..."
            className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
          />
          <span className="text-[10px] text-slate-400 float-right mt-1">
            {editBio.length} / 400 characters
          </span>
        </div>
      </div>

      {/* Section 3: Service Areas (City-based) */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            3. Service Areas (Cities You Cover)
          </h4>
          <span className="text-xs font-semibold text-teal-600">
            {editHospitals.length} {editHospitals.length === 1 ? 'City' : 'Cities'}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Select the cities where you can provide service. You'll receive patient requests from any hospital or clinic in these areas.
        </p>

        {/* Selected area tags */}
        <div className="flex flex-wrap gap-2">
          {editHospitals.map((h) => (
            <span
              key={h}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800 text-xs font-bold"
            >
              <MapPin className="w-3 h-3 text-teal-600" />
              {h}
              <button
                type="button"
                onClick={() => setEditHospitals(editHospitals.filter((x) => x !== h))}
                className="ml-1 text-teal-600 hover:text-rose-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Preset city/area suggestions */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400">Quick Add Cities:</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_SERVICE_AREAS.filter((p) => !editHospitals.includes(p)).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setEditHospitals([...editHospitals, p])}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-teal-50 hover:text-teal-700 transition-colors"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom area input */}
        <div className="flex items-center gap-2 max-w-md">
          <Input
            placeholder="Add another city or area..."
            value={customHospital}
            onChange={(e) => setCustomHospital(e.target.value)}
            className="h-9 text-xs rounded-xl"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (customHospital.trim() && !editHospitals.includes(customHospital.trim())) {
                setEditHospitals([...editHospitals, customHospital.trim()]);
                setCustomHospital('');
              }
            }}
            className="h-9 text-xs font-bold rounded-xl"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Section 4: Service Categories */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          4. Care Services & Capabilities
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SERVICE_CATEGORIES.map((cat) => {
            const isChecked = editCategories.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => {
                  if (isChecked) {
                    setEditCategories(editCategories.filter((c) => c !== cat.id));
                  } else {
                    setEditCategories([...editCategories, cat.id]);
                  }
                }}
                className={`p-3.5 rounded-2xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                  isChecked
                    ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-500 text-teal-900 dark:text-teal-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-xs font-bold">{cat.label}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                    isChecked ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-400'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 5: Available Days */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          5. Weekly Availability Days
        </h4>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = editAvailableDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setEditAvailableDays(editAvailableDays.filter((d) => d !== day));
                  } else {
                    setEditAvailableDays([...editAvailableDays, day]);
                  }
                }}
                className={`w-12 h-10 rounded-xl font-bold text-xs transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 6: Bank & Payout Details */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          6. Linked Bank Account & Payout Setup
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Account Holder Name
            </label>
            <Input
              value={editBankDetails.accountHolder}
              onChange={(e) =>
                setEditBankDetails({ ...editBankDetails, accountHolder: e.target.value })
              }
              placeholder="e.g. Rahul Sharma"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Bank Account Number
            </label>
            <Input
              value={editBankDetails.accountNumber}
              onChange={(e) =>
                setEditBankDetails({ ...editBankDetails, accountNumber: e.target.value })
              }
              placeholder="e.g. 50100234567890"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Bank IFSC Code
            </label>
            <Input
              value={editBankDetails.ifsc}
              onChange={(e) =>
                setEditBankDetails({ ...editBankDetails, ifsc: e.target.value.toUpperCase() })
              }
              placeholder="e.g. HDFC0001234"
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              UPI ID (VPA) for Instant Demo Payout
            </label>
            <Input
              value={editBankDetails.upiId}
              onChange={(e) =>
                setEditBankDetails({ ...editBankDetails, upiId: e.target.value })
              }
              placeholder="e.g. 9876543210@paytm"
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>
        {profile?.bankDetails?.verified && (
          <p className="text-[11px] font-bold text-emerald-600">✓ Payout account verified by admin</p>
        )}
      </div>

      {/* Section 7: Emergency Standby + Refund Policy */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          7. Emergency Standby & Cancellation Policy
        </h4>
        <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={editEmergencyStandby}
            onChange={(e) => setEditEmergencyStandby(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-teal-600"
          />
          <span>
            <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">Night & acute post-op emergency standby</span>
            <span className="block text-[11px] text-slate-500">Families looking for urgent overnight attendants can find you for critical ICU step-down care.</span>
          </span>
        </label>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Shift cancellation & refund rule
          </label>
          <select
            value={editRefundPolicy}
            onChange={(e) => setEditRefundPolicy(e.target.value)}
            className="h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 w-full"
          >
            <option value="full_6h">100% refund if cancelled &gt;6h before shift</option>
            <option value="half_2_6h">50% refund if cancelled 2–6h before shift</option>
            <option value="none_enroute">0% refund once assistant is en route</option>
          </select>
        </div>
      </div>

      {/* Section 8: Shift Rate Card */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          8. Multi-Shift Rate Card (₹)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            ['halfDay4h', '4h Half-Day'],
            ['day8h', '8h Day Shift'],
            ['night12h', '12h Night Shift'],
            ['full24h', '24h Full Stay'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
              <Input
                type="number"
                min={0}
                value={editRateCard[key]}
                onChange={(e) => setEditRateCard({ ...editRateCard, [key]: Number(e.target.value) })}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Section 9: Clinical Tags + Preferred Hospitals */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          9. Specialized Skills & Hospital Footprint
        </h4>
        <div className="flex flex-wrap gap-2">
          {editClinicalTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEditClinicalTags(editClinicalTags.filter((x) => x !== t))}
              className="px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-xs font-bold"
              title="Remove"
            >
              {t} ✕
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={clinicalTagInput}
            onChange={(e) => setClinicalTagInput(e.target.value)}
            placeholder="e.g. Tracheostomy Care, Dementia, Bedridden"
            className="h-10 text-xs rounded-xl"
          />
          <Button
            type="button"
            onClick={() => {
              const v = clinicalTagInput.trim();
              if (v && !editClinicalTags.includes(v)) setEditClinicalTags([...editClinicalTags, v].slice(0, 20));
              setClinicalTagInput('');
            }}
            className="h-10 text-xs rounded-xl shrink-0"
            variant="outline"
          >
            Add
          </Button>
        </div>
        <p className="text-[11px] text-slate-500">Preferred hospitals (top 5) — use service-areas field above; saved list: {editPreferredHospitals.join(', ') || '—'}</p>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
        <Button
          type="submit"
          disabled={savingProfile}
          className="bg-teal-600 hover:bg-teal-700 text-white font-black text-xs px-8 h-11 rounded-2xl shadow-md shadow-teal-600/20"
        >
          {savingProfile ? 'Saving Preferences...' : 'Save Profile Changes'}
        </Button>
      </div>
    </form>
  );
};
