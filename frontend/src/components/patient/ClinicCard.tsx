/**
 * Clinic detail card — used on clinic directory listings.
 *
 * Ported from client/src/components/ClinicCard.jsx.
 * Migration changes:
 *   - framer-motion → motion/react
 *   - react-router-dom Link → next/link
 *   - TypeScript prop types
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Building2, MapPin, Star, Users, BadgeCheck, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import BookingModal from '@/components/shared/modals/BookingModal';
import type { Doctor as DoctorModel } from '@/types/models/doctor';

export interface Clinic {
  _id: string;
  name: string;
  photos?: string[];
  verified?: boolean;
  established?: number;
  totalDoctors?: number;
  address?: string;
  city?: string;
  rating?: number;
  reviewsCount?: number;
  specialties?: string[];
  open?: boolean;
}

interface ClinicCardProps {
  clinic: Clinic;
  index?: number;
}

export default function ClinicCard({ clinic, index = 0 }: ClinicCardProps) {
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<(Partial<DoctorModel> & Pick<DoctorModel, '_id'>) | null>(null);
  const fallbackDist = '0.8';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col h-full"
    >
      <Link href={`/clinic/${clinic._id}`} className="block relative overflow-hidden">
        <div className="relative h-44 overflow-hidden">
          {clinic.photos?.[0] ? (
            <img
              src={clinic.photos[0]}
              alt={clinic.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-primary/10">
              <Building2 className="w-16 h-16 text-primary/25" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {clinic.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-success/90 text-white shadow-lg shadow-success/30">
                <BadgeCheck className="w-3 h-3" /> Verified
              </span>
            )}
          </div>

          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-heading font-bold text-white text-lg leading-tight drop-shadow-sm">
              {clinic.name}
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              {clinic.established && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <CalendarDays className="w-3 h-3" />
                  Est. {clinic.established}
                </span>
              )}
              {clinic.totalDoctors && clinic.totalDoctors > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">
                  <Users className="w-3 h-3" />
                  {clinic.totalDoctors || 0} Doctors
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
          <span className="line-clamp-1">
            {clinic.address}{clinic.city ? `, ${clinic.city}` : ''}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0 text-primary/60" />
          <span>{fallbackDist} km away</span>
        </div>

        {clinic.specialties != null && clinic.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {clinic.specialties!.slice(0, 3).map((spec: string) => (
              <Badge key={spec} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-lg">
                {spec.length > 12 ? spec.slice(0, 12) + '…' : spec}
              </Badge>
            ))}
            {clinic.specialties!.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-lg">
                +{clinic.specialties.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-auto">
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    'w-3.5 h-3.5 transition-colors',
                    s <= Math.round(clinic.rating || 0)
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-muted-foreground/20 fill-muted-foreground/10',
                  )}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-foreground">
              {clinic.rating && clinic.rating > 0 ? clinic.rating.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-muted-foreground">
              {clinic.reviewsCount && clinic.reviewsCount > 0 ? `${clinic.reviewsCount} reviews` : 'No reviews'}
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-md w-fit">
          <Clock className="w-3 h-3" />
          {clinic.open ? 'Open Now' : 'Closed'}
        </div>
      </div>

      <div className="p-4 pt-0">
        <Button
          variant="default"
          size="sm"
          className="w-full gap-2 rounded-xl h-9 shadow-lg shadow-primary/20"
          onClick={() => { setSelectedDoctor(null); setShowBooking(true); }}
        >
          <CalendarDays className="w-4 h-4" />
          Book Appointment
        </Button>
      </div>

      <BookingModal
        open={showBooking}
        onOpenChange={(open: boolean) => {
          setShowBooking(open);
          if (!open) setSelectedDoctor(null);
        }}
        doctor={selectedDoctor}
        facility={clinic as unknown as Record<string, unknown> & { _id: string }}
      />
    </motion.div>
  );
}
