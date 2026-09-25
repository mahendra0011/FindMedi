import React from 'react';
import { Badge } from '../../components/ui/badge';

interface LawyerDocumentsTabProps {
  profile: any;
}

export const LawyerDocumentsTab: React.FC<LawyerDocumentsTabProps> = ({ profile }) => {
  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
        Advocate Legal Credentials & Certificates
      </h3>

      <div className="space-y-3">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              State Bar Council Enrollment Certificate
            </div>
            <div className="text-slate-500 mt-0.5">
              Enrollment No: {profile?.barCouncilNumber}
            </div>
          </div>
          <Badge
            className={
              profile?.isDocumentVerified
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 text-white'
            }
          >
            {profile?.isDocumentVerified ? 'Verified' : 'Pending Verification'}
          </Badge>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              Law Degree (LLB / LLM) Qualification
            </div>
            <div className="text-slate-500 mt-0.5">
              Year of Enrollment: {profile?.yearOfEnrollment || 'Registered'}
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white">Attached</Badge>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              Government Photo Identity ({profile?.govtIdType || 'ID'})
            </div>
            <div className="text-slate-500 mt-0.5">
              Number: {profile?.govtIdNumber || 'Verified ID'}
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white">Verified</Badge>
        </div>
      </div>
    </div>
  );
};
