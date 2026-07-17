import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, MapPin, Phone, Star, CalendarDays, Users,
  ShieldCheck, Truck, BedDouble, Stethoscope, Heart, Brain,
  Bone, Baby, Eye, Activity, Droplets, ArrowRight, Ambulance,
  FlaskConical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const ACCREDITATION_COLORS = {
  NABH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NABL: 'bg-blue-50 text-blue-700 border-blue-200',
  ISO: 'bg-amber-50 text-amber-700 border-amber-200',
};

const HOSPITAL_TYPE_STYLES = {
  'Government': 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  'Private': 'bg-sky-500/15 text-sky-600 border-sky-500/30',
};

export default function HospitalCard({ hospital, index = 0 }) {
  const navigate = useNavigate();
  const yearsSinceEst = hospital.establishedYear
    ? new Date().getFullYear() - hospital.establishedYear
    : null;

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            'w-3.5 h-3.5 transition-colors',
            s <= Math.round(rating)
              ? 'text-yellow-500 fill-yellow-500'
              : 'text-muted-foreground/20 fill-muted-foreground/10'
          )}
        />
      ))}
    </div>
  );

  const getInitials = (name) =>
    name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'H';

  const getHospitalTypeLabel = (type) => {
    if (!type) return null;
    if (type.toLowerCase().includes('government')) return 'Government';
    if (type.toLowerCase().includes('private')) return 'Private';
    return type;
  };

  const getSpecialtyIcon = (spec) => {
    const icons = {
      Cardiology: Heart,
      Neurology: Brain,
      Orthopedics: Bone,
      Pediatrics: Baby,
      Dermatology: Eye,
      Oncology: Activity,
      'General Medicine': Stethoscope,
      ENT: Users,
    };
    return icons[spec] || Stethoscope;
  };

  const getSpecialtyColor = (spec) => {
    const colors = {
      Cardiology: 'from-red-500/20 to-red-500/5 text-red-500 border-red-500/20',
      Neurology: 'from-purple-500/20 to-purple-500/5 text-purple-500 border-purple-500/20',
      Orthopedics: 'from-blue-500/20 to-blue-500/5 text-blue-500 border-blue-500/20',
      Pediatrics: 'from-green-500/20 to-green-500/5 text-green-500 border-green-500/20',
      Dermatology: 'from-pink-500/20 to-pink-500/5 text-pink-500 border-pink-500/20',
      Oncology: 'from-orange-500/20 to-orange-500/5 text-orange-500 border-orange-500/20',
      'General Medicine': 'from-teal-500/20 to-teal-500/5 text-teal-500 border-teal-500/20',
      ENT: 'from-indigo-500/20 to-indigo-500/5 text-indigo-500 border-indigo-500/20',
    };
    return colors[spec] || 'from-slate-500/20 to-slate-500/5 text-slate-500 border-slate-500/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col"
    >
      {/* ─── Cover Image ─── */}
      <Link to={`/hospitals/${hospital._id}`} className="block relative overflow-hidden">
        <div className="relative h-44 overflow-hidden">
          {hospital.logo ? (
            <img
              src={hospital.logo}
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
                    getSpecialtyColor(spec)
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
                  ACCREDITATION_COLORS[acc] || 'bg-gray-500/15 text-gray-600 border-gray-500/30'
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
          {/* Bed Availability */}
          {hospital.bedAvailability > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
              <BedDouble className="w-3 h-3 text-primary/60" />
              {hospital.bedAvailability} Beds
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
          </div>
          <span className="text-xs text-muted-foreground">
            {hospital.reviewsCount > 0
              ? `${hospital.reviewsCount} review${hospital.reviewsCount !== 1 ? 's' : ''}`
              : 'No reviews'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1 rounded-xl text-[11px] h-9"
            onClick={() => navigate(`/hospitals/${hospital._id}/doctors`)}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Book Appointment
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1 rounded-xl text-[11px] h-9"
            onClick={() => navigate(`/hospital-tests/${hospital._id}`)}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Book Test
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1 rounded-xl text-[11px] h-9 shadow-lg shadow-primary/20 group/btn"
            onClick={() => navigate(`/hospitals/${hospital._id}`)}
          >
            View Hospital
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}