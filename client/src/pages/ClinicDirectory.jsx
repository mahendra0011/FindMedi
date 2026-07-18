import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, MapPin, Stethoscope, UserRound, CalendarDays, IndianRupee, Award, Users, SlidersHorizontal, X, Building2, Clock, Shield, Syringe, BedDouble, Languages, GraduationCap, CircleDot, ChevronDown, ChevronUp, Ambulance, Eye, Heart, Bone, Baby, Activity, Brain, BadgeCheck, Phone, Mail, ArrowRight, Navigation, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ClinicDirectory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [clinics, setClinics] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const data = await api.getDoctors({ doctor_type: 'clinic' });
      setClinics(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadClinics(); }, []);

  const filtered = clinics.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = d.name?.toLowerCase() || '';
    const clinicName = d.clinicProfile?.clinic_name?.toLowerCase() || '';
    const spec = d.specialization?.toLowerCase() || '';
    const area = d.clinicProfile?.clinic_address?.toLowerCase() || d.location?.toLowerCase() || '';
    return name.includes(q) || clinicName.includes(q) || spec.includes(q) || area.includes(q);
  });

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted-foreground/30')} />
      ))}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Find a Clinic</h1>
          <p className="text-muted-foreground mt-1">Search clinics by name, doctor, specialization, or location</p>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clinic or doctor name, specialization, location..."
            className="pl-12 h-12 text-base rounded-2xl" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No clinics found</h3>
            <p className="text-muted-foreground">Try adjusting your search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((doc, i) => {
              const SpecIcon = doc.specialization ? Stethoscope : Stethoscope;
              const initials = doc.name?.split(' ').map(n=>n?.[0]).join('').slice(0,2) || 'CL';
              const clinicName = doc.clinicProfile?.clinic_name || doc.name?.replace('Dr. ','') + ' Clinic';
              const area = doc.clinicProfile?.clinic_address || doc.location || doc.area || doc.address || doc.city || '';
              return (
              <motion.div key={doc._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="group bg-card rounded-2xl border border-border/60 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 transition-all cursor-pointer relative"
                onClick={() => navigate(`/clinic/${doc._id}`)}>
                <div className={cn('absolute top-0 right-0 z-10 px-3 py-1.5 rounded-bl-2xl text-[11px] font-semibold border-l border-b shadow-sm', doc.available
                  ? 'bg-primary/5 text-primary border-primary/20 dark:bg-primary/10'
                  : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:border-red-500/20')}>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" />
                    {doc.available ? (doc.next_available_slot || 'Today') : 'Unavailable'}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 border-2 border-primary/10 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                      {doc.profile_photo
                        ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xl font-bold text-primary">{initials}</span>
                      }
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">{clinicName}</h3>
                        {doc.approved && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">Dr. {doc.name}</p>
                      <p className="text-xs text-primary font-medium">{doc.specialization}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {renderStars(doc.rating)}
                        <span className="text-xs text-muted-foreground ml-1">{doc.rating} ({doc.reviews_count || 0})</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl border border-border/40 p-3 mb-3 space-y-0">
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />Location</span>
                      <span className="font-semibold text-foreground truncate ml-2">{area || '—'}</span>
                    </div>
                    <Separator className="bg-border/30 my-2.5" />
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" />Phone</span>
                      <span className="font-semibold text-foreground">{doc.phone || 'N/A'}</span>
                    </div>
                    <Separator className="bg-border/30 my-2.5" />
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-primary" />Email</span>
                      <span className="font-semibold text-foreground truncate">{doc.email || 'N/A'}</span>
                    </div>
                    <Separator className="bg-border/30 my-2.5" />
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-primary" />Languages</span>
                      <span className="font-semibold text-foreground truncate">{doc.languages?.join(', ') || doc.language || '—'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 mb-3">
                    <span className="text-sm text-muted-foreground">Consultation Fee</span>
                    <span className="font-bold text-lg text-primary">Rs {doc.consultation_fees || doc.fees || 0}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 shadow-lg shadow-primary/20" disabled={!doc.available}
                      onClick={(e) => { e.stopPropagation(); navigate(`/clinic/${doc._id}`); }}>
                      <CalendarDays className="w-3.5 h-3.5" /> {doc.available ? 'Book Appointment' : 'Unavailable'}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5 rounded-xl text-[11px] h-9 group/btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/doctors/${doc._id}`); }}>
                      View Doctor Details
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
