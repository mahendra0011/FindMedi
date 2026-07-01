import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, MapPin, Star, Phone, Mail, Stethoscope, CalendarDays, IndianRupee, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export default function HospitalProfile() {
  const { id } = useParams();
  const [hospital, setHospital] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bookToast, setBookToast] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [hosp, docs] = await Promise.all([
          api.getHospital(id),
          api.getDoctors({ hospitalId: id }).catch(() => []),
        ]);
        if (!hosp) { setNotFound(true); return; }
        setHospital(hosp);
        setDoctors(docs || []);
      } catch (e) {
        setNotFound(true);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const getInitials = (name) =>
    name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'H';

  const renderStars = (rating) =>
    [1, 2, 3, 4, 5].map(s => (
      <Star
        key={s}
        className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted-foreground/30'}`}
      />
    ));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !hospital) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-4">
        <Building2 className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="font-heading text-2xl font-bold text-foreground">Hospital Not Found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          The hospital you're looking for doesn't exist or may have been removed.
        </p>
        <Button asChild>
          <Link to="/hospitals">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hospitals
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/hospitals"><ArrowLeft className="w-4 h-4" /> Hospitals</Link>
        </Button>
      </div>

      {/* Hero section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border/60 p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Logo placeholder */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-heading font-bold text-3xl sm:text-4xl shadow-lg shadow-primary/20 flex-shrink-0">
              {getInitials(hospital.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground truncate">
                  {hospital.name}
                </h1>
                <Badge
                  variant={hospital.status === 'approved' ? 'default' : 'secondary'}
                  className="w-fit capitalize"
                >
                  {hospital.status === 'approved' ? 'Approved' : hospital.status}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  {hospital.address}, {hospital.city}, {hospital.state}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-primary" />
                  {hospital.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-primary" />
                  {hospital.email}
                </span>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-0.5">
                  {renderStars(hospital.rating)}
                </div>
                <span className="font-semibold text-foreground">{hospital.rating}</span>
                <span className="text-muted-foreground text-sm">
                  ({hospital.reviewsCount || 0} reviews)
                </span>
              </div>

              {/* Specialties */}
              {hospital.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {hospital.specialties.map(spec => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {hospital.description && (
            <p className="mt-6 text-muted-foreground leading-relaxed border-t border-border/60 pt-6">
              {hospital.description}
            </p>
          )}
        </motion.div>
      </section>

      {/* Doctors section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Stethoscope className="w-6 h-6 text-primary" />
            Doctors at this Hospital
            <span className="text-base font-normal text-muted-foreground">({doctors.length})</span>
          </h2>

          {doctors.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border/60">
              <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No doctors currently listed for this hospital</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map((doc, i) => (
                <motion.div
                  key={doc._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 overflow-hidden">
                      {doc.profile_photo
                        ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                        : doc.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading font-semibold text-foreground truncate">{doc.name}</h3>
                      <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${doc.available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                      {doc.available ? 'Available' : 'Unavailable'}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{doc.experience} experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                      <span>{doc.rating} rating ({doc.reviews_count || 0} reviews)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-3.5 h-3.5 text-success" />
                      <span className="text-success font-semibold">
                        Rs {doc.consultation_fees || doc.fees || 0} / visit
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <Button
                    className="w-full gap-2"
                    size="sm"
                    disabled={!doc.available}
                    onClick={() => setBookToast(true)}
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Book Appointment
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Toast notification */}
      {bookToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right">
          <div className="bg-card border border-border/60 rounded-xl shadow-xl px-5 py-3 flex items-center gap-3">
            <span className="text-sm text-foreground">Select this doctor to book</span>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setBookToast(false)}>
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
