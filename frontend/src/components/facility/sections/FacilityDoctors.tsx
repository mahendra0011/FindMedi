import { useState } from 'react';
import { Stethoscope, Star, Calendar, Clock, Video, Building2, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DoctorItem {
  id?: string;
  _id?: string;
  name: string;
  specialization?: string;
  qualifications?: string;
  experience?: string | number;
  rating?: number;
  ratingAvg?: number;
  reviewsCount?: number;
  consultFee?: number;
  nextSlot?: string;
  avatar?: string;
  photo?: string;
  modes?: string[];
  department?: string;
}

export interface FacilityDoctorsProps {
  doctors: DoctorItem[];
  onBookDoctor?: (doctor: DoctorItem) => void;
  onViewDoctorProfile?: (doctor: DoctorItem) => void;
}

export default function FacilityDoctors({ doctors = [], onBookDoctor, onViewDoctorProfile }: FacilityDoctorsProps) {
  const [selectedDept, setSelectedDept] = useState('All');

  const depts = ['All', ...Array.from(new Set(doctors.map((d) => d.specialization || d.department).filter(Boolean)))];

  const filtered = doctors.filter((d) => {
    if (selectedDept !== 'All' && (d.specialization !== selectedDept && d.department !== selectedDept)) return false;
    return true;
  });

  return (
    <div className="bg-card border rounded-2xl p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Doctors & Specialists on Team</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Verified clinicians with NMC / DCI / State Council credentials</p>
        </div>
      </div>

      {/* Dept Filter */}
      {depts.length > 2 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {depts.map((d) => (
            <button
              key={d as string}
              type="button"
              onClick={() => setSelectedDept(d as string)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedDept === d
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {d as string}
            </button>
          ))}
        </div>
      )}

      {/* Doctor Cards Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center col-span-2">No doctors listed under this department.</p>
        ) : (
          filtered.map((d, idx) => {
            const avatar = d.avatar || d.photo;
            const initials = (d.name || 'Dr').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={d.id || d._id || idx} className="rounded-xl border p-4 flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all bg-card">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted shrink-0 border">
                    {avatar ? (
                      <img src={avatar} alt={d.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sm text-primary bg-primary/10">
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-foreground truncate">{d.name}</h4>
                      <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                    </div>
                    <p className="text-xs text-primary font-medium truncate">{d.specialization || 'Consultant'}</p>
                    {d.qualifications && <p className="text-[11px] text-muted-foreground truncate">{d.qualifications}</p>}
                    {d.experience && (
                      <p className="text-[11px] text-muted-foreground">{d.experience} years clinical experience</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-foreground">
                      {d.consultFee ? `₹${d.consultFee}` : '₹500'} consult
                    </span>
                    {d.nextSlot && <p className="text-[10px] text-emerald-600 font-medium">Next: {d.nextSlot}</p>}
                  </div>

                  <div className="flex gap-2">
                    {onViewDoctorProfile && (
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onViewDoctorProfile(d)}>
                        Bio
                      </Button>
                    )}
                    <Button size="sm" className="h-8 text-xs font-semibold px-3" onClick={() => onBookDoctor?.(d)}>
                      Book Slot
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
