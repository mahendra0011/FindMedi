import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2, ExternalLink, Heart, Stethoscope, Building2, FlaskConical, Pill, MapPin, Phone, Clock, IndianRupee, GraduationCap, Award, Calendar, ChevronRight, Languages, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function patientRequest(path, opts = {}) {
  return api.dispatch(null, path, opts);
}
const patientApi = {
  getFavorites:  (p={})    => patientRequest('/patient/favorites?' + new URLSearchParams(p)),
  removeFavorite:(id)      => patientRequest(`/patient/favorites/${id}`, { method:'DELETE' }),
};

const typeConfig = {
  doctor:    { icon: Stethoscope, label: 'Doctor',     color: 'text-emerald-600', bg: 'bg-emerald-500/10', gradient: 'from-emerald-500/10 to-transparent', border: 'border-emerald-500/20', lightBg: 'bg-emerald-50/50' },
  hospital:  { icon: Building2,   label: 'Hospital',   color: 'text-blue-600',    bg: 'bg-blue-500/10',    gradient: 'from-blue-500/10 to-transparent',    border: 'border-blue-500/20', lightBg: 'bg-blue-50/50' },
  lab:       { icon: FlaskConical, label: 'Lab',        color: 'text-purple-600', bg: 'bg-purple-500/10',  gradient: 'from-purple-500/10 to-transparent',  border: 'border-purple-500/20', lightBg: 'bg-purple-50/50' },
  pharmacy:  { icon: Pill,         label: 'Pharmacy',   color: 'text-rose-600',   bg: 'bg-rose-500/10',    gradient: 'from-rose-500/10 to-transparent',    border: 'border-rose-500/20', lightBg: 'bg-rose-50/50' },
};

function StarRating({ rating, size = 'sm' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${sizeClass} ${s <= Math.round(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function PatientFavorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getFavorites();
      setFavorites(res?.favorites || []);
    } catch { toast.error('Failed to load favorites'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (id) => {
    try {
      await patientApi.removeFavorite(id);
      setFavorites(fs => fs.filter(f => f._id !== id));
      toast.success('Removed from favorites');
    } catch { toast.error('Failed to remove'); }
  };

  const handleView = (f) => {
    if (f.profile?._id) {
      if (f.refType === 'doctor') navigate(`/doctor/${f.profile._id}`);
      else if (f.refType === 'hospital') navigate(`/hospital/${f.profile._id}`);
      else if (f.refType === 'lab') navigate(`/lab/${f.profile._id}`);
      else if (f.refType === 'pharmacy') navigate(`/pharmacy/${f.profile._id}`);
    } else {
      navigate('/doctors');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Saved & Favorites</h1>
        <p className="text-muted-foreground text-sm">Bookmarked doctors, hospitals, labs, and pharmacies</p>
      </div>

      {/* Stats */}
      {!loading && favorites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(typeConfig).map(([key, cfg]) => {
            const count = favorites.filter(f => f.refType === key).length;
            if (count === 0) return null;
            return (
              <div key={key} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                    <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{cfg.label}s</p>
                </div>
                <p className="font-heading text-2xl font-bold text-foreground">{count}</p>
              </div>
            );
          })}
        </motion.div>
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
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Save doctors, hospitals, labs, and pharmacies you trust for quick access later.</p>
          <Button size="sm" className="mt-4 rounded-xl" onClick={() => navigate('/doctors')}>
            <Stethoscope className="w-3.5 h-3.5 mr-1.5" /> Browse Doctors
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favorites.map((f, i) => {
            const cfg = typeConfig[f.refType] || typeConfig.doctor;
            const TypeIcon = cfg.icon;
            const p = f.profile;

            // Doctor-specific fields
            const isDoctor = f.refType === 'doctor';
            const isFacility = ['hospital', 'lab', 'pharmacy'].includes(f.refType);

            return (
              <motion.div key={f._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="group bg-card rounded-3xl border border-border/50 overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                
                {/* Top Gradient Header */}
                <div className={`bg-gradient-to-br ${cfg.gradient} p-5 pb-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className={`w-16 h-16 rounded-2xl ${cfg.bg} flex items-center justify-center shadow-md shrink-0`}>
                        {p?.profile_photo ? (
                          <img src={p.profile_photo} alt="" className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          <TypeIcon className={`w-8 h-8 ${cfg.color}`} />
                        )}
                      </div>
                      {/* Name + Type + Rating */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            <TypeIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          {p?.available !== undefined && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${p.available ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${p.available ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              {p.available ? 'Available' : 'Unavailable'}
                            </span>
                          )}
                        </div>
                        <h3 className="font-heading font-bold text-foreground text-base leading-tight truncate">{p?.name || f.refName}</h3>
                        {p?.rating > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={p.rating} />
                            <span className="text-xs font-medium text-amber-600">{p.rating}</span>
                            {p?.reviews_count > 0 && (
                              <span className="text-[10px] text-muted-foreground">({p.reviews_count} reviews)</span>
                            )}
                            {p?.patients > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {p.patients}+ patients
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost"
                      className="h-8 w-8 p-0 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                      onClick={() => handleRemove(f._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Profile Details Body */}
                <div className="px-5 py-4 space-y-3">
                  {/* Doctor-specific info */}
                  {isDoctor && (
                    <>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                        {p?.specialization && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Award className="w-3.5 h-3.5 text-primary/70" />
                            <span className="font-medium text-foreground">{p.specialization}</span>
                          </div>
                        )}
                        {p?.experience && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary/70" />
                            <span>{p.experience} experience</span>
                          </div>
                        )}
                        {p?.consultation_fees > 0 && (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                            <IndianRupee className="w-3.5 h-3.5" />
                            <span>₹{p.consultation_fees} fee</span>
                          </div>
                        )}
                      </div>
                      {p?.qualifications && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <GraduationCap className="w-3.5 h-3.5 text-primary/70" />
                          <span>{p.qualifications}</span>
                        </div>
                      )}
                      {p?.languages?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Languages className="w-3.5 h-3.5 text-primary/70" />
                          <span>Speaks: {p.languages.join(', ')}</span>
                        </div>
                      )}
                      {p?.bio && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">{p.bio}</p>
                      )}
                      {p?.education?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Education</p>
                          {p.education.slice(0, 2).map((edu, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <GraduationCap className="w-3 h-3 mt-0.5 text-muted-foreground/60 shrink-0" />
                              <span>{edu.degree || edu.course}{edu.institution ? ` - ${edu.institution}` : ''}{edu.year ? ` (${edu.year})` : ''}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {p?.areas_of_expertise?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.areas_of_expertise.slice(0, 4).map((exp, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/5 text-primary border border-primary/10">
                              {exp}
                            </span>
                          ))}
                          {p.areas_of_expertise.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{p.areas_of_expertise.length - 4} more</span>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Facility-specific info (hospital, lab, pharmacy) */}
                  {isFacility && (
                    <>
                      {p?.description && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">{p.description}</p>
                      )}
                      {p?.type && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5 text-primary/70" />
                          <span className="capitalize">{p.type}</span>
                        </div>
                      )}
                      {p?.services_offered?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.services_offered.slice(0, 4).map((svc, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/5 text-primary border border-primary/10">
                              {svc}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Common fields: address, phone */}
                  <div className="bg-muted/20 rounded-2xl p-3 space-y-1.5 border border-border/30">
                    {p?.location && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{p.location}</span>
                      </div>
                    )}
                    {!p?.location && p?.address && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{p.address}{p.city ? `, ${p.city}` : ''}{p.state ? `, ${p.state}` : ''}</span>
                      </div>
                    )}
                    {p?.phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <a href={`tel:${p.phone}`} className="text-primary hover:underline">{p.phone}</a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border/30 bg-muted/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                    <span>Saved to favorites</span>
                  </div>
                  <Button size="sm"
                    className="gap-1.5 rounded-xl h-8 text-xs shadow-sm"
                    onClick={() => handleView(f)}>
                    <ExternalLink className="w-3 h-3" /> View Full Profile
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}