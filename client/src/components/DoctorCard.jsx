import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, MapPin, Clock, IndianRupee, GraduationCap, Languages,
  CalendarDays, Stethoscope, BadgeCheck, Award, User, Award as Exp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import BookingModal from './BookingModal';

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

export default function DoctorCard({ doctor, index = 0 }) {
  const navigate = useNavigate();
  const [showBooking, setShowBooking] = useState(false);

  if (!doctor) return null;

  const {
    _id, name, specialization, experience, consultation_fees,
    rating = 0, reviews_count = 0, patients = 0, available = true,
    phone, location, profile_photo, bio, qualifications,
    languages = [], areas_of_expertise = [], education = [],
    department, doctor_type,
  } = doctor;

  const initials = (name || '')
    .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  // Hospital vs clinic doctor detail route
  const profilePath = doctor_type === 'clinic'
    ? `/clinic-doctors/${_id}`
    : `/hospital-doctors/${_id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col h-full"
    >
      {/* ─── Cover / Header ─── */}
      <div className="relative">
        <div className="h-24 bg-gradient-to-br from-primary/15 via-primary/5 to-primary/10" />
        <span className={cn(
          'absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm',
          available
            ? 'bg-emerald-500/90 text-white'
            : 'bg-red-500/90 text-white'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', available ? 'bg-white animate-pulse' : 'bg-red-200')} />
          {available ? 'Available' : 'Unavailable'}
        </span>

        {/* Avatar overlapping the cover */}
        <div className="px-4 -mt-8 flex items-end gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-card bg-muted shadow-md shrink-0">
            {profile_photo ? (
              <img src={profile_photo} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <span className="text-lg font-bold text-primary">{initials}</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-heading font-bold text-base text-foreground leading-tight truncate">{name}</h3>
              <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
            </div>
            <p className="text-xs font-medium text-primary truncate">{specialization || department}</p>
          </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="px-4 pt-3 pb-4 space-y-3 flex-1 flex flex-col">
        {/* Rating + fee + patients */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {renderStars(rating)}
            <span className="text-sm font-bold text-foreground">{rating > 0 ? rating.toFixed(1) : '—'}</span>
            {reviews_count > 0 && (
              <span className="text-xs text-muted-foreground">({reviews_count})</span>
            )}
          </div>
          {patients > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="w-3 h-3" /> {patients}+ patients
            </span>
          )}
        </div>

        {/* Quick facts row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {experience && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Exp className="w-3.5 h-3.5 text-primary/70" />
              <span className="font-medium text-foreground">{experience}</span>
            </div>
          )}
          {consultation_fees > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>₹{consultation_fees} fee</span>
            </div>
          )}
          {languages?.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Languages className="w-3.5 h-3.5 text-primary/70" />
              <span>{languages.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Qualifications */}
        {qualifications && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="w-3.5 h-3.5 text-primary/70 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{qualifications}</span>
          </div>
        )}

        {/* Bio */}
        {bio && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">{bio}</p>
        )}

        {/* Areas of expertise */}
        {areas_of_expertise?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {areas_of_expertise.slice(0, 4).map((exp, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-primary/5 text-primary border border-primary/10">
                {exp}
              </span>
            ))}
            {areas_of_expertise.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{areas_of_expertise.length - 4} more</span>
            )}
          </div>
        )}

        {/* Contact */}
        {(location || phone) && (
          <div className="bg-muted/30 rounded-xl p-2.5 space-y-1 border border-border/30">
            {location && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1.5 text-xs">
                <a href={`tel:${phone}`} className="text-primary hover:underline truncate">{phone}</a>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 rounded-xl text-[11px] h-9"
            onClick={() => setShowBooking(true)}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Book Appointment
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 shadow-lg shadow-primary/20"
            onClick={() => navigate(profilePath)}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            View Profile
          </Button>
        </div>
      </div>

      <BookingModal
        open={showBooking}
        onOpenChange={setShowBooking}
        doctor={doctor}
        facility={null}
      />
    </motion.div>
  );
}
