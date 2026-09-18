import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MapPin, Award, ChevronRight, Microscope, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const coverGradients = [
  'from-primary/80 via-primary/50 to-primary/20',
  'from-blue-600/80 via-blue-500/50 to-blue-400/20',
  'from-purple-600/80 via-purple-500/50 to-purple-400/20',
  'from-emerald-600/80 via-emerald-500/50 to-emerald-400/20',
];

function renderStars(rating, size = 'w-3 h-3') {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            size,
            s <= Math.round(rating || 0)
              ? 'text-amber-400 fill-amber-400'
              : 'text-muted-foreground/20 fill-muted-foreground/10'
          )}
        />
      ))}
    </div>
  );
}

function getInitials(name) {
  return name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'TC';
}

export default function TechnicianCard({ technician, index = 0 }) {
  const navigate = useNavigate();

  if (!technician) return null;

  const {
    _id, id, name, role, rating = 0, exp, experience,
    distance, area, address, phone,
  } = technician;

  const techId = _id || id;
  const initials = getInitials(name);
  const expText = exp || experience || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col h-full cursor-pointer"
      onClick={() => navigate(`/technician/${techId}`)}
    >
      {/* ─── Cover ─── */}
      <div className={cn(
        'relative h-20 bg-gradient-to-br flex items-center justify-center',
        coverGradients[(index || 0) % coverGradients.length]
      )}>
        <div className="absolute inset-0 bg-black/10" />
        <Microscope className="w-10 h-10 text-white/30 z-10" />
      </div>

      {/* ─── Body ─── */}
      <div className="px-4 pt-0 pb-4 -mt-6 flex-1 flex flex-col">
        {/* Avatar + Name + Role */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-sm shrink-0 border-2 border-card shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all">
            {initials}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <h3 className="font-heading font-semibold text-sm text-foreground leading-tight truncate group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground">{role}</p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-2">
          {renderStars(rating)}
          <span className="text-xs font-medium text-foreground">{rating > 0 ? rating.toFixed(1) : '—'}</span>
        </div>

        {/* Quick facts */}
        <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl border border-border/40 p-2.5 space-y-1.5 flex-1">
          {expText && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Award className="w-3 h-3 text-primary" />Experience
              </span>
              <span className="font-medium text-foreground">{expText}</span>
            </div>
          )}
          {(distance || area) && (
            <>
              {expText && <div className="h-px bg-border/30" />}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-primary" />Location
                </span>
                <span className="font-medium text-foreground truncate ml-2">
                  {[distance, area].filter(Boolean).join(' · ')}
                </span>
              </div>
            </>
          )}
        </div>

        {/* View button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-3 rounded-lg gap-1 mt-2 text-xs w-full justify-center"
          onClick={(e) => { e.stopPropagation(); navigate(`/technician/${techId}`); }}
        >
          View <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </motion.div>
  );
}
