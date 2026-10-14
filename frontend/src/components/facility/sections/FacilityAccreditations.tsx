import { ShieldCheck, Award, CheckCircle2, Shield } from 'lucide-react';

export interface FacilityAccreditationsProps {
  accreditations?: string[];
  insurance?: string[];
}

export default function FacilityAccreditations({ accreditations = [], insurance = [] }: FacilityAccreditationsProps) {
  const accList = accreditations.length > 0 ? accreditations : ['NABH Certified (National Accreditation Board for Hospitals)', 'ISO 9001:2015 Quality Management'];
  const insList = insurance.length > 0 ? insurance : ['Ayushman Bharat PM-JAY (Cashless)', 'Star Health Allied Insurance', 'HDFC ERGO Health', 'ICICI Lombard', 'Care Health Insurance', 'Bajaj Allianz TPA'];

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-6 shadow-sm">
      {/* Accreditations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base text-foreground">Accreditations & Regulatory Certifications</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {accList.map((a, idx) => (
            <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl border bg-blue-500/5 border-blue-500/20 text-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-semibold text-foreground">{a}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Clinical licenses and bio-medical waste compliance verified periodically by FindMedi compliance auditors.
        </p>
      </div>

      {/* Insurance & TPA Cashless Schemes */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-base text-foreground">Empanelled Insurance & Cashless TPA Networks</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {insList.map((ins, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border bg-muted/20 text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {ins}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Cashless approval is subject to policy terms and initial TPA desk pre-authorization verification.
        </p>
      </div>
    </div>
  );
}
