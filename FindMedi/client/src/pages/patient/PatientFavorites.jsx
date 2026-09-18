import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Star, Trash2, Heart, Stethoscope, Building2, FlaskConical, Pill,
  MapPin, Phone, ShieldCheck, Sparkles, Microscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import DoctorCard from '@/components/DoctorCard';
import HospitalCard from '@/components/HospitalCard';
import ClinicCard from '@/components/ClinicCard';
import DiagnosticCenterCard from '@/components/DiagnosticCenterCard';
import PharmacyCard from '@/components/PharmacyCard';

function patientRequest(path, opts = {}) {
  return api.dispatch(null, path, opts);
}
const patientApi = {
  getFavorites:   (p = {}) => patientRequest('/patient/favorites?' + new URLSearchParams(p)),
  removeFavorite: (id) => patientRequest(`/patient/favorites/${id}`, { method: 'DELETE' }),
};

// Filter chip config — colors match the listing-page accents.
const typeConfig = {
  all:       { icon: Sparkles,     label: 'All',        color: 'text-foreground',      bg: 'bg-muted',            activeBg: 'bg-primary text-primary-foreground' },
  doctor:    { icon: Stethoscope,  label: 'Doctor',     color: 'text-emerald-600',     bg: 'bg-emerald-500/10',   activeBg: 'bg-emerald-500 text-white' },
  hospital:  { icon: Building2,    label: 'Hospital',   color: 'text-blue-600',        bg: 'bg-blue-500/10',      activeBg: 'bg-blue-500 text-white' },
  clinic:    { icon: Stethoscope,  label: 'Clinic',     color: 'text-teal-600',        bg: 'bg-teal-500/10',      activeBg: 'bg-teal-500 text-white' },
  lab:       { icon: FlaskConical, label: 'Lab',        color: 'text-purple-600',      bg: 'bg-purple-500/10',    activeBg: 'bg-purple-500 text-white' },
  pharmacy:  { icon: Pill,         label: 'Pharmacy',   color: 'text-rose-600',        bg: 'bg-rose-500/10',      activeBg: 'bg-rose-500 text-white' },
};

// Stats card config (used for the summary tiles).
const statsConfig = {
  doctor:   { icon: Stethoscope,  label: 'Doctors',    color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  hospital: { icon: Building2,    label: 'Hospitals',  color: 'text-blue-600',    bg: 'bg-blue-500/10' },
  clinic:   { icon: Stethoscope,  label: 'Clinics',    color: 'text-teal-600',    bg: 'bg-teal-500/10' },
  lab:      { icon: FlaskConical, label: 'Labs',       color: 'text-purple-600',  bg: 'bg-purple-500/10' },
  pharmacy: { icon: Pill,         label: 'Pharmacies', color: 'text-rose-600',    bg: 'bg-rose-500/10' },
};

// Generic fallback card (used for technician/anything unmapped).
function GenericCard({ favorite }) {
  const p = favorite?.profile || {};
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden h-full flex flex-col">
      <div className="h-20 bg-gradient-to-br from-primary/15 via-primary/5 to-primary/10" />
      <div className="p-4 -mt-8 flex-1 flex flex-col">
        <div className="w-12 h-12 rounded-xl bg-muted border-4 border-card flex items-center justify-center shadow-sm mb-2">
          <Microscope className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-heading font-bold text-foreground truncate">{p.name || favorite.refName}</h3>
        <p className="text-xs text-muted-foreground capitalize">{favorite.refType}</p>
        {p.address && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-2">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="truncate">{p.address}</span>
          </div>
        )}
        {p.phone && (
          <div className="flex items-center gap-1.5 text-xs mt-1">
            <Phone className="w-3 h-3 text-muted-foreground/60" />
            <a href={`tel:${p.phone}`} className="text-primary hover:underline">{p.phone}</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientFavorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getFavorites();
      setFavorites(res?.favorites || []);
    } catch {
      toast.error('Failed to load favorites');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (id) => {
    // Optimistic removal
    const prev = favorites;
    setFavorites((fs) => fs.filter((f) => f._id !== id));
    try {
      await patientApi.removeFavorite(id);
      toast.success('Removed from favorites');
    } catch {
      setFavorites(prev); // rollback
      toast.error('Failed to remove');
    }
  };

  // Live counts per type
  const counts = useMemo(() => {
    const c = { all: favorites.length };
    favorites.forEach((f) => { c[f.refType] = (c[f.refType] || 0) + 1; });
    return c;
  }, [favorites]);

  const filtered = useMemo(
    () => activeFilter === 'all'
      ? favorites
      : favorites.filter((f) => f.refType === activeFilter),
    [favorites, activeFilter]
  );

  // Render the matching full card for a favorite
  const renderCard = (f, index) => {
    const p = f.profile;
    switch (f.refType) {
      case 'doctor':
        return <DoctorCard doctor={p} index={index} />;
      case 'hospital':
        return <HospitalCard hospital={p} index={index} />;
      case 'clinic':
        return <ClinicCard clinic={p} />;
      case 'lab':
        return <DiagnosticCenterCard clinic={p} index={index} />;
      case 'pharmacy':
        return <PharmacyCard pharmacy={p} index={index} />;
      default:
        return <GenericCard favorite={f} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Saved & Favorites</h1>
        <p className="text-muted-foreground text-sm">Bookmarked doctors, hospitals, clinics, labs, and pharmacies</p>
      </div>

      {/* Stats */}
      {!loading && favorites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(statsConfig).map(([key, cfg]) => {
            const count = counts[key] || 0;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(activeFilter === key ? 'all' : key)}
                className={cn(
                  'text-left bg-card rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md',
                  activeFilter === key ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/50'
                )}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', cfg.bg)}>
                    <cfg.icon className={cn('w-4 h-4', cfg.color)} />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{cfg.label}</p>
                </div>
                <p className="font-heading text-2xl font-bold text-foreground">{count}</p>
              </button>
            );
          })}
        </motion.div>
      )}

      {/* Filter bar */}
      {!loading && favorites.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(typeConfig).map(([key, cfg]) => {
            const count = counts[key] || 0;
            // Hide empty type chips except "All"
            if (key !== 'all' && count === 0) return null;
            const Icon = cfg.icon;
            const isActive = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  isActive
                    ? cn(cfg.activeBg, 'border-transparent shadow-sm')
                    : cn(cfg.bg, cfg.color, 'border-border/50 hover:border-primary/30')
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
                <span className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-white/20' : 'bg-background/70'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-lg font-semibold text-foreground">No favorites yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Save doctors, hospitals, clinics, labs, and pharmacies you trust for quick access later.
          </p>
          <Button size="sm" className="mt-4 rounded-xl" onClick={() => navigate('/doctors')}>
            <Stethoscope className="w-3.5 h-3.5 mr-1.5" /> Browse Doctors
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-10 text-center">
          <p className="text-sm text-muted-foreground">No {activeFilter} favorites yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((f, i) => (
            <div key={f._id} className="relative group/wrap h-full">
              {/* Remove button overlay */}
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 z-20 h-8 w-8 p-0 rounded-xl bg-card/90 backdrop-blur-sm border border-border/50 text-destructive/70 hover:text-destructive hover:bg-destructive/10 shadow-sm"
                onClick={() => handleRemove(f._id)}
                title="Remove from favorites"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              {renderCard(f, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
