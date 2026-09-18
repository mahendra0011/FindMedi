/**
 * Hospital detail card — used on the HospitalDirectory listing and dashboard.
 *
 * Ported from client/src/components/HospitalCard.jsx.
 * Key migration changes:
 *   - framer-motion → motion/react (Phase 5 rule: one animation library)
 *   - react-router-dom Link/useNavigate → next/link + next/navigation
 *   - Added TypeScript prop types (Hospital interface)
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';


import { Building2, MapPin, Phone, Star, CalendarDays, Users, ShieldCheck, BedDouble, Stethoscope, Heart, Brain, Bone, Baby, Eye, Activity, Ambulance, FlaskConical, BadgeCheck, Clock, Mail, Navigation } from 'lucide-react';
import type { Hospital } from '@/types/models/hospital';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';



import BookingModal from '@/components/shared/modals/BookingModal';
import type { Doctor as DoctorModel } from '@/types/models/doctor';


const ACCREDITATION_COLORS: Record<string, string> = {
  NABH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NABL: 'bg-blue-50 text-blue-700 border-blue-200',
  ISO: 'bg-amber-50 text-amber-700 border-amber-200',
};

const SPECIALTY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Cardiology: Heart,
  Neurology: Brain,
  Orthopedics: Bone,
  Pediatrics: Baby,
  Dermatology: Eye,
  Oncology: Activity,
  'General Medicine': Stethoscope,
  ENT: Users,
};

const SPECIALTY_COLORS: Record<string, string> = {
  Cardiology: 'from-red-500/20 to-red-500/5 text-red-500 border-red-500/20',
  Neurology: 'from-purple-500/20 to-purple-500/5 text-purple-500 border-purple-500/20',
  Orthopedics: 'from-blue-500/20 to-blue-500/5 text-blue-500 border-blue-500/20',
  Pediatrics: 'from-green-500/20 to-green-500/5 text-green-500 border-green-500/20',
  Dermatology: 'from-pink-500/20 to-pink-500/5 text-pink-500 border-pink-500/20',
  Oncology: 'from-orange-500/20 to-orange-500/5 text-orange-500 border-orange-500/20',
  'General Medicine': 'from-teal-500/20 to-teal-500/5 text-teal-500 border-teal-500/20',
  ENT: 'from-indigo-500/20 to-indigo-500/5 text-indigo-500 border-indigo-500/20',
};

interface HospitalCardProps {
  hospital: Hospital;
  index?: number;
  distance?: string | number;
  actionButtons?: React.ReactNode;
}

/** Convert a rating number (1-5) into a star array for rendering. */
function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            'w-3.5 h-3.5 transition-colors',
            s <= Math.round(rating)
              ? 'text-yellow-500 fill-yellow-500'
              : 'text-muted-foreground/20 fill-muted-foreground/10',
          )}
        />
      ))}
    </div>
  );
}

/** Get the icon component for a specialty, with a fallback. */
function getSpecialtyIcon(spec: string): React.ComponentType<{ className?: string }> {
  return SPECIALTY_ICONS[spec] ?? Stethoscope;
}

/** Get the color classes for a specialty chip. */
function getSpecialtyColor(spec: string): string {
  return SPECIALTY_COLORS[spec] ?? 'from-slate-500/20 to-slate-500/5 text-slate-500 border-slate-500/20';
}

export default function HospitalCard({ hospital, index = 0, distance }: HospitalCardProps) {
  const navigate = useRouter();
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<(Partial<DoctorModel> & Pick<DoctorModel, '_id'>) | null>(null);

  const yearsSinceEst = hospital.establishedYear
    ? new Date().getFullYear() - hospital.establishedYear
    : null;
  const fallbackDist = distance || hospital.distance || '0.8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col"
    >
      {/* ─── Cover Image ─── */}
      <Link href={`/hospitals/${hospital.slug || hospital._id}`} className="block relative overflow-hidden">
        <div className="relative h-44 overflow-hidden">
          {hospital.logo || hospital.image ? (
            <img
              src={hospital.logo || hospital.image}
              alt={hospital.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-primary/10">
              <Building2 className="w-16 h-16 text-primary/25" />
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Top badges row ─ Emergency + Accreditation */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {hospital.status === 'approved' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-success/90 text-white shadow-lg shadow-success/30">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
              {hospital.emergency24x7 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-500/90 text-white shadow-lg shadow-red-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping absolute" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white relative" />
                  24/7 Emergency
                </span>
              )}
            </div>

            {/* Hospital Type badge */}
            {hospital.hospitalType && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-sm bg-white/20 text-white border border-white/30 shadow-sm shrink-0">
                {hospital.hospitalType}
              </span>
            )}
          </div>

          {/* Bottom: Hospital Name + Established */}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-heading font-bold text-white text-lg leading-tight drop-shadow-sm">
              {hospital.name}
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              {hospital.establishedYear && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <CalendarDays className="w-3 h-3" />
                  Est. {hospital.establishedYear} {yearsSinceEst ? `(${yearsSinceEst}+ yrs)` : ''}
                </span>
              )}
              {hospital.totalDoctors > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <Users className="w-3 h-3" />
                  {hospital.totalDoctors} Doctors
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* ─── Card Body ─── */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Address + Phone */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
            <span className="line-clamp-1">
              {hospital.address}, {hospital.city}{hospital.state ? `, ${hospital.state}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="w-4 h-4 shrink-0 text-primary/60" />
            <span>{hospital.phone}</span>
          </div>
          {hospital.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4 shrink-0 text-primary/60" />
              <span className="truncate">{hospital.email}</span>
            </div>
          )}
          {/* Distance */}
          {fallbackDist && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="w-4 h-4 shrink-0 text-primary/60" />
              <span>{fallbackDist} km away</span>
            </div>
          )}
        </div>

        {/* Specialties / Departments as chips */}
        {hospital.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hospital.specialties.slice(0, 4).map((spec) => {
              const Icon = getSpecialtyIcon(spec);
              return (
                <span
                  key={spec}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-gradient-to-br',
                    getSpecialtyColor(spec),
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {spec.length > 10 ? spec.slice(0, 10) + '…' : spec}
                </span>
              );
            })}
            {hospital.specialties.length > 4 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground border border-border/50">
                +{hospital.specialties.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Accreditation Badges */}
        {hospital.accreditations?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hospital.accreditations.map((acc) => (
              <span
                key={acc}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border',
                  ACCREDITATION_COLORS[acc] || 'bg-gray-500/15 text-gray-600 border-gray-500/30',
                )}
              >
                <ShieldCheck className="w-3 h-3" />
                {acc}
              </span>
            ))}
          </div>
        )}

        {/* Availability Info Row */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {/* Open Now / Timing */}
          {hospital.emergency24x7 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3" />
              Open 24/7
            </span>
          ) : hospital.workingHours?.weekdays ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3 text-primary/60" />
              {hospital.workingHours.weekdays.includes('24/7') ? 'Open 24/7' : hospital.workingHours.weekdays}
            </span>
          ) : null}

          {/* Bed Availability */}
          {hospital.bedAvailability > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
              <BedDouble className="w-3 h-3 text-primary/60" />
              {hospital.bedAvailability} Beds
            </span>
          )}

          {/* Distance */}
          {fallbackDist && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
              <Navigation className="w-3 h-3 text-primary shrink-0" />
              {fallbackDist} km away
            </span>
          )}

          {/* Ambulance Service */}
          {hospital.ambulanceService && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              <Ambulance className="w-3 h-3" />
              Ambulance
            </span>
          )}
        </div>

        {/* Rating + Reviews */}
        <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-auto">
          <div className="flex items-center gap-2">
            <div className="flex">{renderStars(hospital.rating)}</div>
            <span className="text-sm font-bold text-foreground">
              {hospital.rating > 0 ? hospital.rating.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-muted-foreground">
              {hospital.reviewsCount > 0
                ? `${hospital.reviewsCount} review${hospital.reviewsCount !== 1 ? 's' : ''}`
                : 'No reviews'}
            </span>
          </div>
        </div>

        {/* Action Buttons - Row 1 */}
        <div className="flex gap-2 pt-1 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1 rounded-xl text-[11px] h-9"
            onClick={() => { setSelectedDoctor(null); setShowBooking(true); }}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Book Appointment
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1 rounded-xl text-[11px] h-9"
            onClick={() => navigate.push(`/hospitals/${hospital.slug || hospital._id}/doctors`)}
          >
            <Users className="w-3.5 h-3.5" />
            View Available Doctors
          </Button>
        </div>

        {/* Action Buttons - Row 2 */}
        <div className="flex gap-2 pt-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1 rounded-xl text-[11px] h-9"
            onClick={() => navigate.push(`/book-test/${hospital._id}`)}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Book Test
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1 rounded-xl text-[11px] h-9 shadow-lg shadow-primary/20 group/btn"
            onClick={() => navigate.push(`/hospitals/${hospital.slug || hospital._id}`)}
          >
            View Hospital Details
          </Button>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={showBooking}
        onOpenChange={(open: boolean) => {
          setShowBooking(open);
          if (!open) setSelectedDoctor(null);
        }}
        doctor={selectedDoctor}
        facility={hospital}
      />
    </motion.div>
  );
}
