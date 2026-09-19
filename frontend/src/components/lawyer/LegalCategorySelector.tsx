import React from 'react';
import {
  Scale,
  FileSpreadsheet,
  AlertOctagon,
  ShoppingBag,
  HeartHandshake,
  Gavel,
  Home,
  Briefcase,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export interface LegalCategory {
  id: string;
  code: string;
  name: string;
  icon: any;
  desc: string;
  color: string;
}

export const LEGAL_CATEGORIES: LegalCategory[] = [
  {
    id: 'medical_negligence',
    code: 'medical_negligence',
    name: 'Medical Negligence',
    icon: Scale,
    desc: 'Hospital negligence, surgical faults, incorrect medication & malpractice claims',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'insurance',
    code: 'insurance',
    name: 'Insurance Disputes',
    icon: FileSpreadsheet,
    desc: 'Health insurance rejection, delayed settlement, cashless denial & TPA issues',
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'accident_mlc',
    code: 'accident_mlc',
    name: 'Accident & MLC Cases',
    icon: AlertOctagon,
    desc: 'Medico-Legal Cases (MLC), road accidents, trauma compensation & police FIRs',
    color: 'from-rose-500 to-red-600',
  },
  {
    id: 'consumer_rights',
    code: 'consumer_rights',
    name: 'Consumer Rights',
    icon: ShoppingBag,
    desc: 'Hospital overbilling, package rate fraud & medical service deficiency disputes',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'family_law',
    code: 'family_law',
    name: 'Family & Personal Matters',
    icon: HeartHandshake,
    desc: 'Legal guardianship, patient consent authorization & family inheritance rights',
    color: 'from-purple-500 to-pink-600',
  },
  {
    id: 'criminal_law',
    code: 'criminal_law',
    name: 'Criminal Law',
    icon: Gavel,
    desc: 'Bail, police FIR defense, medical negligence criminal complaints & inquests',
    color: 'from-slate-700 to-zinc-900',
  },
  {
    id: 'civil_property',
    code: 'civil_property',
    name: 'Civil & Property',
    icon: Home,
    desc: 'Power of attorney, patient property preservation & civil injunctions',
    color: 'from-teal-600 to-cyan-700',
  },
  {
    id: 'corporate_contract',
    code: 'corporate_contract',
    name: 'Corporate & Contracts',
    icon: Briefcase,
    desc: 'Hospital vendor agreements, healthcare enterprise contracts & regulatory compliance',
    color: 'from-indigo-600 to-sky-700',
  },
  {
    id: 'general_consultation',
    code: 'general_consultation',
    name: 'General Legal Advice',
    icon: HelpCircle,
    desc: 'First legal opinion, document vetting & comprehensive legal advisory',
    color: 'from-violet-600 to-indigo-700',
  },
];

interface Props {
  selectedCategory: string;
  onSelectCategory: (catCode: string) => void;
  multiSelect?: boolean;
  selectedCategories?: string[];
  onToggleCategory?: (catCode: string) => void;
}

export const LegalCategorySelector: React.FC<Props> = ({
  selectedCategory,
  onSelectCategory,
  multiSelect = false,
  selectedCategories = [],
  onToggleCategory,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {LEGAL_CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isSelected = multiSelect
          ? selectedCategories.includes(cat.code)
          : selectedCategory === cat.code;

        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              if (multiSelect && onToggleCategory) {
                onToggleCategory(cat.code);
              } else {
                onSelectCategory(cat.code);
              }
            }}
            className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              isSelected
                ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-sm'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${cat.color} text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>

              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {cat.name}
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {cat.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
