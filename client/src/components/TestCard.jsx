import { motion } from 'framer-motion';
import {
  Star, Clock, MapPin, Home, ShieldCheck,
  Lock, Stethoscope, Building2, Microscope, BadgeCheck,
  Tag, Percent, ArrowRight, ClipboardList, Zap, Eye,
  Syringe, Scan, Wifi, Radio, Droplets
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const renderStars = (rating) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={cn('w-3 h-3 transition-colors', s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20 fill-muted-foreground/10')} />
    ))}
  </div>
);

const ProviderIcon = ({ type }) => {
  const icons = {
    hospital: Building2,
    clinic: Stethoscope,
    lab_technician: Microscope,
    phlebotomist: Syringe,
    radiographer: Radio,
    sonographer: Scan,
  };
  const Icon = icons[type] || Microscope;
  return <Icon className="w-4 h-4" />;
};

const PrescriptionBadge = ({ required }) => (
  required
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-500/20"><Lock className="w-3 h-3" />Rx Required</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><BadgeCheck className="w-3 h-3" />Direct</span>
);

const TagPill = ({ icon: Icon, children, variant = 'default' }) => {
  const variants = {
    default: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border', variants[variant])}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
};

const InfoRow = ({ icon: Icon, label, value, highlight }) => (
  <div className="flex items-center gap-2 min-w-0">
    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </div>
    <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className={cn('text-xs font-semibold truncate', highlight ? 'text-success' : 'text-foreground')}>{value}</span>
    </div>
  </div>
);

export default function TestCard({ test, index = 0 }) {
  const {
    providerType = 'lab_technician',
    name,
    testName,
    prescriptionReq = false,
    category,
    department,
    clinicType,
    providerLogo,
    providerName,
    nablAccredited = false,
    aerbCertified = false,
    distance,
    rating = 4.5,
    reviewsCount = 0,
    reportTime,
    mode,
    linkedDoctor,
    admissionReq = false,
    homeCollection = false,
    homeCollectionFee,
    reportsOnline = false,
    packageLink,
    doctor,
    quickTest = false,
    walkinAvailable = false,
    price = 0,
    mrp,
    originalPrice,
    discount,
    sampleType,
    equipmentType,
    scanType,
    certifiedPhlebotomist = false,
    certifiedSonographer = false,
    onBook,
    onUploadRx,
    onViewProvider,
  } = test || {};

  const isHospital = providerType === 'hospital';
  const isClinic = providerType === 'clinic';
  const isLabTechnician = providerType === 'lab_technician';
  const isPhlebotomist = providerType === 'phlebotomist';
  const isRadiographer = providerType === 'radiographer';
  const isSonographer = providerType === 'sonographer';
  const isTechnician = isLabTechnician || isPhlebotomist;

  const getProviderIcon = () => {
    if (isHospital) return <Building2 className="w-4 h-4 text-primary" />;
    if (isClinic) return <Stethoscope className="w-4 h-4 text-primary" />;
    if (isLabTechnician) return <Microscope className="w-4 h-4 text-primary" />;
    if (isPhlebotomist) return <Syringe className="w-4 h-4 text-primary" />;
    if (isRadiographer) return <Radio className="w-4 h-4 text-primary" />;
    if (isSonographer) return <Scan className="w-4 h-4 text-primary" />;
    return <Microscope className="w-4 h-4 text-primary" />;
  };

  const getViewButtonLabel = () => {
    if (isHospital) return 'View Hospital';
    if (isClinic) return 'View Clinic';
    if (isLabTechnician) return 'View Lab';
    if (isPhlebotomist) return 'View Provider';
    if (isRadiographer) return 'View Center';
    if (isSonographer) return 'View Center';
    return 'View Provider';
  };

  const getBookButtonLabel = () => {
    if (prescriptionReq) return 'Upload Rx to Book';
    if (isPhlebotomist && homeCollection) return 'Book Home Collection';
    if (isLabTechnician && homeCollection) return 'Book with Home Collection';
    return 'Book Now';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col"
    >
      <div className="p-4 space-y-3 flex-1 flex flex-col">

        {/* ─── Top Row: Test Name + Prescription Badge ─── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
              {getProviderIcon()}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-sm text-foreground leading-tight truncate">{name || testName}</h3>
            </div>
          </div>
          <PrescriptionBadge required={prescriptionReq} />
        </div>

        {/* ─── Second Row: Category + Type-Specific Tags ─── */}
        <div className="flex items-center flex-wrap gap-1.5">
          {category && (
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-lg border border-border/40">{category}</span>
          )}
          {isHospital && department && (
            <TagPill icon={Building2} variant="blue">{department}</TagPill>
          )}
          {isClinic && clinicType && (
            <TagPill icon={Stethoscope} variant="purple">{clinicType}</TagPill>
          )}
          {isLabTechnician && nablAccredited && (
            <TagPill icon={ShieldCheck} variant="success">NABL Accredited</TagPill>
          )}
          {isPhlebotomist && nablAccredited && (
            <TagPill icon={ShieldCheck} variant="success">NABL Accredited</TagPill>
          )}
          {isRadiographer && aerbCertified && (
            <TagPill icon={ShieldCheck} variant="amber">AERB Certified</TagPill>
          )}
        </div>

        {/* ─── Provider Info Row ─── */}
        <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 border border-border/40">
          {providerLogo ? (
            <img src={providerLogo} alt={providerName} className="w-9 h-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
              <ProviderIcon type={providerType} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{providerName}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />{distance}</span>
              <span className="text-muted-foreground/30">|</span>
              <span className="inline-flex items-center gap-1">
                {renderStars(rating)}
                <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                <span>({reviewsCount})</span>
              </span>
            </div>
          </div>
        </div>

        {/* ─── Tags Row ─── */}
        <div className="flex flex-wrap gap-1.5">
          {isHospital && linkedDoctor && (
            <TagPill icon={Stethoscope} variant="blue">Advised by {linkedDoctor}</TagPill>
          )}
          {isHospital && admissionReq && (
            <TagPill icon={ClipboardList} variant="rose">Admission Required</TagPill>
          )}
          {isHospital && mode && (
            <TagPill icon={Building2} variant="amber">{mode}</TagPill>
          )}
          {isClinic && quickTest && (
            <TagPill icon={Zap} variant="amber">Quick Test</TagPill>
          )}
          {isClinic && walkinAvailable && (
            <TagPill icon={Building2} variant="success">Walk-in Available</TagPill>
          )}
          {isClinic && doctor && (
            <TagPill icon={Stethoscope} variant="blue">{doctor}</TagPill>
          )}
          {isLabTechnician && homeCollection && (
            <TagPill icon={Home} variant="default">Home Collection{homeCollectionFee ? ` (+₹${homeCollectionFee})` : ''}</TagPill>
          )}
          {isLabTechnician && reportsOnline && (
            <TagPill icon={Wifi} variant="success">Reports Online</TagPill>
          )}
          {isLabTechnician && nablAccredited && (
            <TagPill icon={ShieldCheck} variant="blue">NABL</TagPill>
          )}
          {isPhlebotomist && homeCollection && (
            <TagPill icon={Home} variant="success">Home Collection{homeCollectionFee ? ` (+₹${homeCollectionFee})` : ''}</TagPill>
          )}
          {isPhlebotomist && certifiedPhlebotomist && (
            <TagPill icon={BadgeCheck} variant="blue">Certified Phlebotomist</TagPill>
          )}
          {isRadiographer && (
            <TagPill icon={MapPin} variant="amber">Visit Required</TagPill>
          )}
          {isSonographer && (
            <TagPill icon={MapPin} variant="amber">Visit Required</TagPill>
          )}
          {isSonographer && certifiedSonographer && (
            <TagPill icon={BadgeCheck} variant="blue">Certified Sonographer</TagPill>
          )}
        </div>

        {/* ─── Middle Info Rows ─── */}
        <div className="bg-gradient-to-br from-muted/50 to-muted/5 rounded-xl border border-border/40 p-3.5 space-y-2.5">
          <InfoRow icon={Clock} label="Report Time" value={reportTime} />
          {isHospital && mode && (
            <InfoRow icon={Building2} label="Mode" value={mode} />
          )}
          {isHospital && linkedDoctor && (
            <InfoRow icon={Stethoscope} label="Linked Doctor" value={linkedDoctor} />
          )}
          {isClinic && doctor && (
            <InfoRow icon={Stethoscope} label="Doctor" value={doctor} />
          )}
          {isLabTechnician && homeCollection && (
            <InfoRow icon={Home} label="Home Collection" value={homeCollectionFee ? `Available (+₹${homeCollectionFee})` : 'Available'} highlight />
          )}
          {isLabTechnician && packageLink && (
            <InfoRow icon={Tag} label="Package" value={packageLink} />
          )}
          {isPhlebotomist && sampleType && (
            <InfoRow icon={Droplets} label="Sample Type" value={sampleType} />
          )}
          {isRadiographer && equipmentType && (
            <InfoRow icon={Radio} label="Equipment" value={equipmentType} />
          )}
          {isSonographer && scanType && (
            <InfoRow icon={Scan} label="Scan Type" value={scanType} />
          )}
        </div>

        {/* ─── Price Box ─── */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/15">
          <div className="flex items-center gap-2">
            {isTechnician && discount ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <Percent className="w-3 h-3" />{discount}% off
              </span>
            ) : isRadiographer && discount ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <Percent className="w-3 h-3" />{discount}% off
              </span>
            ) : isSonographer && discount ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <Percent className="w-3 h-3" />{discount}% off
              </span>
            ) : discount ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <Percent className="w-3 h-3" />{discount}% off
              </span>
            ) : (
              <Tag className="w-4 h-4 text-primary" />
            )}
            <span className="text-xs font-medium text-muted-foreground">Price</span>
          </div>
          <div className="flex items-baseline gap-2">
            {(originalPrice || mrp) && (
              <span className="text-sm text-muted-foreground line-through">₹{originalPrice || mrp}</span>
            )}
            <span className="font-bold text-xl text-primary">₹{price}</span>
          </div>
        </div>

        {/* ─── Bottom Buttons ─── */}
        <div className="flex gap-2 pt-1 mt-auto">
          {prescriptionReq ? (
            <Button className="flex-1 gap-1.5 rounded-xl h-9 text-[11px] font-semibold shadow-lg shadow-primary/20" onClick={onUploadRx}>
              <Lock className="w-3.5 h-3.5" />
              Upload Rx to Book
            </Button>
          ) : (
            <Button className="flex-1 gap-1.5 rounded-xl h-9 text-[11px] font-semibold shadow-lg shadow-primary/20 group/btn" onClick={onBook}>
              {getBookButtonLabel()}
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl h-9 text-[11px] font-semibold" onClick={onViewProvider}>
            <Eye className="w-3.5 h-3.5" />
            {getViewButtonLabel()}
          </Button>
        </div>

      </div>
    </motion.div>
  );
}
