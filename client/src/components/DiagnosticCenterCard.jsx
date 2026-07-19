import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, ShieldCheck, Home, Clock, MapPin, Phone, Mail,
  FlaskConical, Eye, BadgeCheck, Zap,
  ChevronRight, Sparkles, Calendar,
  GraduationCap, Briefcase, Award, PhoneCall, Microscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TECHNICIAN_DATA = {
  'Pathology Lab': {
    name: 'Ramesh Kumar',
    role: 'Lab Technician',
    qualifications: ['DMLT', 'BMLT'],
    experience: '5 years',
    regNo: 'MLT-2021-00452',
  },
  'Diagnostic Center': {
    name: 'Amit Sharma',
    role: 'Phlebotomist',
    qualifications: ['B.Sc MLT', 'Phlebotomy Certified'],
    experience: '4 years',
    regNo: 'DMLT-2020-00321',
  },
  'Imaging Center': {
    name: 'Suresh Patel',
    role: 'Radiographer',
    qualifications: ['B.Sc Radiography', 'RDMS'],
    experience: '6 years',
    regNo: 'AERB-RT-2022-00317',
    subTech: { name: 'Priya Verma', role: 'Sonographer', qualifications: ['Ultrasound Certified', 'ARDMS'], experience: '4 years', regNo: 'SDMS-2021-00128' },
  },
};

function getFallbackTech(type) {
  return TECHNICIAN_DATA[type] || TECHNICIAN_DATA['Diagnostic Center'];
}

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

const coverGradients = [
  'from-primary/90 via-primary/60 to-primary/20',
  'from-blue-600/90 via-blue-500/60 to-blue-400/20',
  'from-purple-600/90 via-purple-500/60 to-purple-400/20',
  'from-emerald-600/90 via-emerald-500/60 to-emerald-400/20',
];
const avatarGradients = ['from-primary/30', 'from-blue-500/30', 'from-purple-500/30', 'from-emerald-500/30'];

export default function DiagnosticCenterCard({ clinic, index = 0 }) {
  const navigate = useNavigate();
  const {
    _id, name, logo, type = 'Diagnostic Center', rating = 4.5, reviewsCount = 200,
    verified = true, open = true, tags = [],
    testsAvailable = 250, homeCollection = true,
    reportTime = 'Within 6 hrs', distance = '1.2 km',
    phone = '9876543210', email = '', address = '',
    startingPrice = 150, workingHours = '8:00 AM - 8:00 PM',
    technicianName, technicianRole, technicianQualification, technicianExperience,
  } = clinic || {};

  const tech = technicianName
    ? {
        name: technicianName,
        role: technicianRole || getFallbackTech(type).role,
        qualifications: technicianQualification ? technicianQualification.split(', ') : getFallbackTech(type).qualifications,
        experience: technicianExperience || getFallbackTech(type).experience,
        regNo: '',
      }
    : getFallbackTech(type);
  const techInitials = tech.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const labInitials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 flex flex-col"
    >
      {/* ─── Cover ─── */}
      <div className={cn(
        'relative h-28 bg-gradient-to-br flex items-center justify-center',
        coverGradients[index % coverGradients.length]
      )}>
        <div className="absolute inset-0 bg-black/10" />
        {logo ? (
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/40 shadow-lg z-10">
            <img src={logo} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className={cn(
            'w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-2xl font-bold text-white shadow-lg z-10',
            avatarGradients[index % avatarGradients.length]
          )}>
            {labInitials}
          </div>
        )}
        <span className={cn(
          'absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold shadow-md z-10',
          open
            ? 'bg-emerald-500/90 text-white backdrop-blur-sm border border-emerald-300/40'
            : 'bg-red-500/90 text-white backdrop-blur-sm border border-red-300/40'
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-white animate-pulse' : 'bg-red-200')} />
          {open ? 'Open Now' : 'Closed'}
        </span>
      </div>

      {/* ─── Body ─── */}
      <div className="px-4 pt-3 pb-4 space-y-2.5 flex-1 flex flex-col">

        {/* Identity: Lab Name + Technician Name + Designation */}
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-white shrink-0 shadow-sm border border-white/20',
            avatarGradients[(index + 1) % avatarGradients.length]
          )}>
            {techInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-heading font-bold text-base text-foreground leading-tight truncate">{name}</h3>
              {verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
            </div>
            <p className="text-xs font-medium text-muted-foreground">{type}</p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">{tech.name}</p>
            <p className="text-xs text-muted-foreground">{tech.role}</p>
            {tech.subTech && (
              <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border/20">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-400/30 to-purple-500/10 flex items-center justify-center text-[9px] font-bold text-purple-600 shrink-0">
                  {tech.subTech.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1 flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground truncate">{tech.subTech.name}</span>
                  <span className="text-[10px] text-muted-foreground">{tech.subTech.role}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rating + Reviews */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {renderStars(rating)}
            <span className="text-sm font-bold text-foreground">{rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviewsCount})</span>
          </div>
        </div>

        {/* Address + Distance */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{address || 'Location not available'}</span>
          {distance && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="shrink-0 font-medium text-muted-foreground">{distance}</span>
            </>
          )}
        </div>

        {/* Qualification Badges */}
        <div className="flex flex-wrap gap-1.5">
          {tech.qualifications.map(q => (
            <span key={q} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/30">
              <GraduationCap className="w-3 h-3 text-primary" />
              {q}
            </span>
          ))}
          {tech.regNo && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border/30">
              <ShieldCheck className="w-3 h-3 text-blue-500" />
              {tech.regNo}
            </span>
          )}
        </div>

        {/* Info Grid */}
        <div className="bg-gradient-to-br from-muted/50 to-muted/5 rounded-xl border border-border/40 p-3 space-y-1.5">
          <div className="grid grid-cols-2 gap-1">
            <InfoRow icon={Briefcase} label="Experience" value={tech.experience} />
            <InfoRow icon={FlaskConical} label="Tests" value={`${testsAvailable}+`} />
          </div>
          <Divider />
          <div className="grid grid-cols-2 gap-1">
            <InfoRow icon={Home} label="Home Collection" value={homeCollection ? 'Available' : 'Not Available'} highlight={homeCollection} />
            <InfoRow icon={Clock} label="Report Time" value={reportTime} />
          </div>
          <Divider />
          <div className="grid grid-cols-2 gap-1">
            <InfoRow icon={Phone} label="Phone" value={phone} />
            <InfoRow icon={Mail} label="Email" value={email || 'N/A'} />
          </div>
          <Divider />
          <div className="grid grid-cols-1 gap-1">
            <InfoRow icon={Award} label="Working Hours" value={workingHours} />
          </div>
        </div>

        {/* Tags Row */}
        <div className="flex flex-wrap gap-1.5">
          {tags.includes('NABL Accredited') && (
            <TagBadge icon={ShieldCheck} variant="blue">NABL Accredited</TagBadge>
          )}
          {tags.includes('24x7') && (
            <TagBadge icon={Zap} variant="amber">24x7</TagBadge>
          )}
          {tags.includes('Reports Online') && (
            <TagBadge icon={Clock} variant="success">Online Reports</TagBadge>
          )}
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

        {/* 4 Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
          <Button
            variant="outline"
            className="gap-1.5 rounded-xl h-10 text-xs font-semibold"
            onClick={() => navigate(`/book-test/${_id}`)}
          >
            <Calendar className="w-3.5 h-3.5" />
            Book Test
          </Button>
          <Button
            variant="outline"
            className="gap-1.5 rounded-xl h-10 text-xs font-semibold"
            onClick={() => navigate(`/lab/${_id}/details`)}
          >
            <Eye className="w-3.5 h-3.5" />
            View Lab
          </Button>
          <Button
            variant="outline"
            className="gap-1.5 rounded-xl h-10 text-xs font-semibold"
            onClick={() => navigate(`/technician/${_id}`)}
          >
            <Microscope className="w-3.5 h-3.5" />
            View Technician
          </Button>
          <Button
            className="gap-1.5 rounded-xl h-10 text-xs font-semibold shadow-lg shadow-primary/20 group/btn"
            onClick={() => window.open(`tel:${phone}`)}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Call Now
            <ChevronRight className="w-3 h-3 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3 text-primary" />
      </div>
      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
        <span className="text-[11px] text-muted-foreground truncate">{label}</span>
        <span className={cn(
          'text-[11px] font-semibold truncate',
          highlight ? 'text-emerald-600' : 'text-foreground'
        )}>
          {value}
        </span>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/20" />;
}
