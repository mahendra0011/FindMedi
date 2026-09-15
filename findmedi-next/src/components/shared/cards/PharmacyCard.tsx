/**
 * Pharmacy store card — used on the Pharmacy listing page.
 *
 * Ported from client/src/components/PharmacyCard.jsx.
 * Migration changes:
 *   - framer-motion → motion/react
 *   - react-router-dom useNavigate → next/navigation useRouter
 *   - TypeScript prop types
 */
'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Star, MapPin, Phone, Pill, BadgeCheck, Truck, Clock,
  CreditCard, ShoppingBag, Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Pharmacy {
  _id: string;
  name: string;
  logo?: string;
  image?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  rating?: number;
  reviewsCount?: number;
  workingHours?: string;
  amenities?: Record<string, boolean>;
  description?: string;
  distance?: string;
}

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  index?: number;
}

const STAR_SIZE = 'w-3.5 h-3.5';

function renderStars(rating: number, size = STAR_SIZE) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            size,
            'transition-colors',
            s <= Math.round(rating)
              ? 'text-yellow-500 fill-yellow-500'
              : 'text-muted-foreground/20 fill-muted-foreground/10',
          )}
        />
      ))}
    </div>
  );
}

const AMENITY_CONFIG = [
  { key: 'homeDelivery', icon: Truck, label: 'Home Delivery' },
  { key: 'cardPayment', icon: CreditCard, label: 'Card Payment' },
  { key: 'prescriptionUpload', icon: null, label: 'Rx Upload' },
] as const;

export default function PharmacyCard({ pharmacy, index = 0 }: PharmacyCardProps) {
  const navigate = useRouter();

  if (!pharmacy) return null;

  const {
    _id, name, logo, image, address, city, state,
    phone, rating = 0, reviewsCount = 0, workingHours = '',
    amenities = {}, description, distance,
  } = pharmacy;

  const cover = image || logo;
  const fallbackDist = distance || pharmacy.distance;

  const amenityChips = AMENITY_CONFIG.filter((a) => amenities?.[a.key]).map(({ key, icon, label }) => ({ key, Icon: icon, label }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col h-full"
    >
      {/* ─── Cover ─── */}
      <button
        onClick={() => navigate.push(`/buy-medicine/${_id}`)}
        className="block relative overflow-hidden text-left"
      >
        <div className="relative h-32 overflow-hidden">
          {cover ? (
            <img
              src={cover}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-500/15 via-rose-500/5 to-rose-500/10">
              <Pill className="w-12 h-12 text-rose-400/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

          {/* Verified badge */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/90 text-white shadow-lg shadow-rose-500/30">
              <BadgeCheck className="w-3 h-3" /> Pharmacy
            </span>
          </div>

          {/* Name on cover */}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-heading font-bold text-white text-lg leading-tight drop-shadow-sm truncate">{name}</h3>
          </div>
        </div>
      </button>

      {/* ─── Body ─── */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Address + phone */}
        <div className="space-y-1.5">
          {address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
              <span className="line-clamp-1">{address}{city ? `, ${city}` : ''}{state ? `, ${state}` : ''}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 shrink-0 text-primary/60" />
              <a href={`tel:${phone}`} className="hover:text-primary hover:underline">{phone}</a>
            </div>
          )}
          {fallbackDist && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="w-4 h-4 shrink-0 text-primary/60" />
              <span>{fallbackDist} km away</span>
            </div>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">{description}</p>
        )}

        {/* Amenity chips */}
        {amenityChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {amenityChips.map(({ key, Icon, label }) => (
              <span key={key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                {Icon && <Icon className="w-3 h-3" />}
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Working hours */}
        {workingHours && (
          <div className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-md w-fit">
            <Clock className="w-3 h-3" />
            {workingHours}
          </div>
        )}

        {/* Rating + reviews */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40 mt-auto">
          {renderStars(rating)}
          <span className="text-sm font-bold text-foreground">{rating > 0 ? rating.toFixed(1) : '—'}</span>
          <span className="text-xs text-muted-foreground">
            {reviewsCount > 0 ? `${reviewsCount} reviews` : 'No reviews'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1 mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 rounded-xl text-[11px] h-9"
            onClick={() => navigate.push(`/buy-medicine/${_id}`)}
          >
            <Pill className="w-3.5 h-3.5" />
            View Store
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 shadow-lg shadow-primary/20"
            onClick={() => navigate.push(`/buy-medicine/${_id}/medicines`)}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Order Medicines
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
