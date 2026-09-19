import React from 'react';
import { FileText, Pill, ClipboardList, Bell, Users, HeartHandshake, Check } from 'lucide-react';

export interface ServiceCategory {
  id: string;
  name: string;
  shortDesc: string;
  icon: React.ElementType;
  badgeColor: string;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'paperwork',
    name: 'Paperwork & Admission Help',
    shortDesc: 'Filling & submitting admission forms, insurance claims & discharge papers.',
    icon: FileText,
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  {
    id: 'medicine',
    name: 'Medicine Pickup & Delivery',
    shortDesc: 'Buying and bringing prescribed medicines directly from the pharmacy.',
    icon: Pill,
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  {
    id: 'reports',
    name: 'Report Collection',
    shortDesc: 'Collecting physical lab, diagnostic, blood and radiology reports.',
    icon: ClipboardList,
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
  {
    id: 'errand',
    name: 'Errand & General Needs',
    shortDesc: 'Food, water, documents, standing in hospital queues, staff liaison.',
    icon: Bell,
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  {
    id: 'full_attendant',
    name: 'Full-Time Attendant',
    shortDesc: 'End-to-end dedicated presence combining all care and errand tasks for the shift.',
    icon: Users,
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800',
  },
  {
    id: 'elderly_care',
    name: 'Elderly / Special Care Support',
    shortDesc: 'Patient wheelchair assistance, walking support and compassionate company.',
    icon: HeartHandshake,
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  },
];

interface Props {
  selected: string[];
  onChange?: (categories: string[]) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export const ServiceCategorySelector: React.FC<Props> = ({
  selected = [],
  onChange,
  readOnly = false,
  compact = false,
}) => {
  const toggleCategory = (id: string) => {
    if (readOnly || !onChange) return;
    if (id === 'full_attendant') {
      // If selecting full attendant, we can select all or toggle full_attendant
      if (selected.includes('full_attendant')) {
        onChange(selected.filter((c) => c !== 'full_attendant'));
      } else {
        onChange([...selected, 'full_attendant']);
      }
      return;
    }

    if (selected.includes(id)) {
      onChange(selected.filter((c) => c !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {SERVICE_CATEGORIES.map((cat) => {
          const isSelected = selected.includes(cat.id);
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              disabled={readOnly}
              onClick={() => toggleCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                isSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
              {isSelected && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {SERVICE_CATEGORIES.map((cat) => {
        const isSelected = selected.includes(cat.id);
        const Icon = cat.icon;
        return (
          <div
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={`relative p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
              isSelected
                ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 shadow-md ring-2 ring-teal-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                  {cat.name}
                </h4>
              </div>

              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 ${
                  isSelected
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 bg-transparent'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {cat.shortDesc}
            </p>
          </div>
        );
      })}
    </div>
  );
};
