import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, ShieldCheck, Home, Clock, MapPin, Phone,
  FlaskConical, HeartPulse, Heart, Eye, BadgeCheck, Zap,
  ChevronRight, Sparkles, Calendar, Scan
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const renderStars = (rating) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={cn(
          'w-3 h-3 transition-colors',
          s <= Math.round(rating)
            ? 'text-amber-400 fill-amber-400'
            : 'text-muted-foreground/20 fill-muted-foreground/10'
        )}
      />
    ))}
  </div>
);

const TagBadge = ({ icon: Icon, children, variant = 'primary' }) => {
  const variants = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  };
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border',
      variants[variant]
    )}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};

export default function DiagnosticCenterCard({ clinic, index = 0 }) {
  const navigate = useNavigate();
  const {
    _id, name, logo, type = 'Diagnostic Center', rating = 4.5, reviewsCount = 200,
    verified = true, open = true, tags = [],
    testsAvailable = 250, imagingFields = 'MRI, CT, X-Ray, Ultrasound',
    cardiacFields = 'ECG, 2D Echo, TMT', homeCollection = true,
    reportTime = 'Within 6 hrs', distance = '1.2 km',
    phone = '9876543210', startingPrice = 150
  } = clinic || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 flex flex-col"
    >
      {/* ─── Cover ─── */}
      <div className="relative h-40 overflow-hidden">
        {logo ? (
          <img
            src={logo}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-600/30 via-emerald-500/15 to-emerald-400/5 flex items-center justify-center">
            <div className="relative">
              <HeartPulse className="w-16 h-16 text-emerald-400/20" />
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-400/20 animate-pulse" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-lg',
            open
              ? 'bg-emerald-500 text-white shadow-emerald-500/30'
              : 'bg-red-500/90 text-white shadow-red-500/30'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-white animate-pulse' : 'bg-white/60')} />
            {open ? 'Open Now' : 'Closed'}
          </span>
        </div>

        {/* Overlay Content */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-heading font-bold text-white text-xl leading-tight drop-shadow-sm mb-1">
            {name}
          </h3>
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-[11px] font-semibold text-white/90 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/25">
              {type}
            </span>
            {verified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-500/25 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                <BadgeCheck className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">

        {/* Rating + NABL Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {renderStars(rating)}
            <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviewsCount})</span>
          </div>
          {tags.includes('NABL Accredited') && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-lg shrink-0">
              <ShieldCheck className="w-3 h-3" />
              NABL
            </span>
          )}
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-1.5">
          {tags.includes('NABL Accredited') && (
            <TagBadge icon={ShieldCheck} variant="blue">
              NABL Accredited
            </TagBadge>
          )}
          {tags.includes('Home Collection') && (
            <TagBadge icon={Home} variant="primary">
              Home Collection
            </TagBadge>
          )}
          {tags.includes('Reports Online') && (
            <TagBadge icon={Clock} variant="success">
              Reports Online
            </TagBadge>
          )}
          {tags.includes('24x7') && (
            <TagBadge icon={Zap} variant="amber">
              24x7
            </TagBadge>
          )}
          {tags.includes('Imaging Available') && (
            <TagBadge icon={Scan} variant="purple">
              Imaging Available
            </TagBadge>
          )}
        </div>

        {/* Info Grid */}
        <div className="bg-gradient-to-br from-muted/50 to-muted/5 rounded-xl border border-border/40 p-3.5 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <InfoRow icon={FlaskConical} label="Tests" value={`${testsAvailable}+`} />
            <InfoRow icon={Scan} label="Imaging" value={imagingFields} />
          </div>
          <Divider />
          <div className="grid grid-cols-2 gap-2">
            <InfoRow icon={Heart} label="Cardiac" value={cardiacFields} />
            <InfoRow icon={Clock} label="Reports" value={reportTime} />
          </div>
          <Divider />
          <div className="grid grid-cols-2 gap-2">
            <InfoRow icon={MapPin} label="Distance" value={distance} />
            <InfoRow icon={Phone} label="Phone" value={phone} />
          </div>
        </div>

        {/* Price Strip */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/15">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Starting from</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground line-through">₹{startingPrice + 200}</span>
            <span className="font-bold text-xl text-primary">₹{startingPrice}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 pt-1 mt-auto">
          <Button
            variant="outline"
            className="flex-1 gap-1.5 rounded-xl h-10 text-xs font-semibold"
            onClick={() => navigate(`/book-test/${_id}`)}
          >
            <Calendar className="w-3.5 h-3.5" />
            Book Tests
          </Button>
          <Button
            className="flex-[1.5] gap-1.5 rounded-xl h-10 text-xs font-semibold shadow-lg shadow-primary/20 group/btn"
            onClick={() => navigate(`/lab/${_id}/details`)}
          >
            <Eye className="w-3.5 h-3.5" />
            View Center Details
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        <span className={cn(
          'text-xs font-semibold truncate',
          highlight ? 'text-success' : 'text-foreground'
        )}>
          {value}
        </span>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/30" />;
}
