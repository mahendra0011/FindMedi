import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  MapPin,
  Languages,
  BadgeCheck,
  HeartHandshake,
  User,
  IndianRupee,
  Award as Exp,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AssistantUrgentIntakeModal from './AssistantUrgentIntakeModal';

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
              : 'text-muted-foreground/20 fill-muted-foreground/10'
          )}
        />
      ))}
    </div>
  );
}

const DEFAULT_AVATARS: Record<string, string> = {
  'Sunita Sharma': 'https://images.unsplash.com/photo-1594824813575-58535a824e4d?w=400&h=400&fit=crop&crop=faces',
  'Manoj Chouhan': 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=faces',
  'Pooja Tiwari': 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=faces',
  'Neha Kulkarni': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
  'Rajesh Yadav': 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=faces',
};

interface AssistantCardProps {
  assistant: any;
  index?: number;
  onSelect?: () => void;
}

export default function AssistantCard({ assistant, index = 0 }: AssistantCardProps) {
  const navigate = useNavigate();
  const [showUrgentIntake, setShowUrgentIntake] = useState(false);

  if (!assistant) return null;

  const {
    _id,
    name,
    serviceCategories = [],
    experienceYears,
    pricePerHour,
    rating = 0,
    reviewsCount = 0,
    bookingsCompleted = 0,
    isAvailable = true,
    profilePhoto,
    bio,
    languages = [],
    hospitalsCovered = [],
    operatingCity,
  } = assistant;

  const profilePath = `/assistants/${_id}`;
  const photoSrc =
    profilePhoto ||
    DEFAULT_AVATARS[name] ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Assistant')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 p-5 flex flex-col h-full justify-between"
    >
      <div className="space-y-3">
        {/* Top Header: Profile Photo + Name + Online Status */}
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            <img
              src={photoSrc}
              alt={name}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-primary/20 shadow-md bg-muted"
              onError={(e: any) => {
                e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Assistant')}`;
              }}
            />
            <span
              className={cn(
                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card',
                isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              )}
              title={isAvailable ? 'Available Now' : 'Unavailable'}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-heading font-bold text-base text-foreground leading-tight truncate">
                  {name}
                </h3>
                <span title="Verified Assistant" className="inline-flex shrink-0">
                  <BadgeCheck className="w-4 h-4 text-primary" />
                </span>
              </div>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs shrink-0',
                  isAvailable
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                )}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  )}
                />
                {isAvailable ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <p className="text-xs font-semibold text-primary truncate mt-0.5">
              {serviceCategories[0] || 'Hospital Care Assistant'}
              {serviceCategories.length > 1 ? ` +${serviceCategories.length - 1} more` : ''}
            </p>

            {/* Rating Row */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {renderStars(rating)}
              <span className="text-xs font-bold text-foreground">
                {rating > 0 ? Number(rating).toFixed(1) : '5.0'}
              </span>
              {reviewsCount > 0 && (
                <span className="text-[11px] text-muted-foreground">({reviewsCount})</span>
              )}
              {bookingsCompleted > 0 && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                    <User className="w-3 h-3" /> {bookingsCompleted}+ bookings
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick facts row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1 border-t border-border/40">
          {experienceYears && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Exp className="w-3.5 h-3.5 text-primary/70" />
              <span className="font-medium text-foreground">{experienceYears} yrs exp</span>
            </div>
          )}
          {pricePerHour > 0 && (
            <div className="flex items-center gap-1 text-emerald-600 font-bold">
              <IndianRupee className="w-3.5 h-3.5" />
              <span>₹{pricePerHour}/hr</span>
            </div>
          )}
          {languages?.length > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Languages className="w-3.5 h-3.5 text-primary/70" />
              <span className="truncate max-w-[130px]">{languages.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <p className="text-xs text-muted-foreground/85 line-clamp-2 leading-relaxed">
            "{bio}"
          </p>
        )}

        {/* Service category tags */}
        {serviceCategories?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {serviceCategories.slice(0, 3).map((c: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium bg-primary/5 text-primary border border-primary/10"
              >
                <HeartHandshake className="w-2.5 h-2.5" /> {c}
              </span>
            ))}
            {serviceCategories.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{serviceCategories.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Operating city */}
        {operatingCity && (
          <div className="bg-muted/30 rounded-xl p-2.5 border border-border/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-red-500/80 shrink-0" />
              <span className="truncate font-semibold text-foreground">{operatingCity}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-3 border-t border-border/40 mt-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 font-semibold"
          onClick={() => navigate(profilePath)}
        >
          <User className="w-3.5 h-3.5" />
          View Profile
        </Button>
        <Button
          variant="default"
          size="sm"
          className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 shadow-md bg-red-600 hover:bg-red-700 text-white font-bold"
          onClick={() => setShowUrgentIntake(true)}
          disabled={!isAvailable}
        >
          <Clock className="w-3.5 h-3.5" />
          Book Urgent
        </Button>
      </div>

      <AssistantUrgentIntakeModal
        open={showUrgentIntake}
        onOpenChange={setShowUrgentIntake}
        assistant={assistant}
        onSuccess={() => {
          setShowUrgentIntake(false);
        }}
      />
    </motion.div>
  );
}
