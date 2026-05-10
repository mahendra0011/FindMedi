import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Star, Clock, Phone, Mail, CalendarDays, Filter, ChevronRight, CheckCircle, IndianRupee, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const specializations = ['All', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Oncology', 'General Medicine', 'ENT'];

export default function PatientDoctors() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [viewProfile, setViewProfile] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingType, setBookingType] = useState('Consultation');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const data = await api.getDoctors({ search, specialization: specFilter });
      setDoctors(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadDoctors(); }, [search, specFilter]);

  const handleBook = async () => {
    if (!bookingDate || !bookingTime || !selectedDoctor) return;
    try {
      const details = {
        patient: user.name,
        patientId: user._id,
        doctor: selectedDoctor.name,
        doctorId: selectedDoctor._id,
        department: selectedDoctor.specialization,
        date: bookingDate,
        time: bookingTime,
        status: 'Pending',
        type: bookingType,
        notes: bookingNotes,
        fees: selectedDoctor.consultation_fees || selectedDoctor.fees || 0,
      };
      await api.createAppointment(details);
      setBookingDetails(details);
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedDoctor(null);
        setBookingDate('');
        setBookingTime('');
        setBookingNotes('');
        setBookingDetails(null);
      }, 3000);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Find Doctors</h1>
        <p className="text-muted-foreground">Search by specialization and book appointments</p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or specialization..." className="pl-10" />
        </div>
        <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Specialization</label>
              <div className="flex gap-2 flex-wrap">
                {specializations.map(s => (
                  <button key={s} onClick={() => setSpecFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${specFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No doctors found matching your criteria</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc, i) => (
            <motion.div key={doc._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:shadow-primary/5 transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0 overflow-hidden">
                  {doc.profile_photo
                    ? <img src={doc.profile_photo} alt="" className="w-full h-full object-cover" />
                    : doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-semibold text-foreground truncate">{doc.name}</h3>
                  <p className="text-sm text-primary font-medium">{doc.specialization}</p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-xs font-semibold ${doc.available ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {doc.available ? 'Available' : 'Unavailable'}
                </div>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /><span>{doc.experience} experience</span></div>
                <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-warning fill-warning" /><span>{doc.rating} rating ({doc.reviews_count || 0} reviews)</span></div>
                <div className="flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5 text-success" /><span className="text-success font-semibold">₹{doc.consultation_fees || doc.fees || 0} / visit</span></div>
                <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /><span>{doc.phone}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewProfile(doc)}>
                  View Profile
                </Button>
                <Button className="flex-1 gap-1" size="sm" disabled={!doc.available} onClick={() => setSelectedDoctor(doc)}>
                  <CalendarDays className="w-3.5 h-3.5" /> Book
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Profile Modal */}
      {viewProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setViewProfile(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden">
                {viewProfile.profile_photo
                  ? <img src={viewProfile.profile_photo} alt="" className="w-full h-full object-cover" />
                  : viewProfile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground">{viewProfile.name}</h3>
                <p className="text-primary font-medium">{viewProfile.specialization}</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= Math.round(viewProfile.rating) ? 'text-warning fill-warning' : 'text-muted'}`} />)}
                  <span className="text-sm text-muted-foreground ml-1">({viewProfile.reviews_count || 0})</span>
                </div>
              </div>
            </div>

            {viewProfile.bio && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">About</p>
                <p className="text-sm text-foreground">{viewProfile.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Experience</p>
                <p className="font-semibold text-foreground">{viewProfile.experience}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Consultation Fee</p>
                <p className="font-semibold text-success">₹{viewProfile.consultation_fees || viewProfile.fees || 0}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Patients Treated</p>
                <p className="font-semibold text-foreground">{viewProfile.patients || 0}</p>
              </div>
            </div>

            {viewProfile.qualifications && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Qualifications</p>
                <p className="text-sm text-foreground">{viewProfile.qualifications}</p>
              </div>
            )}

            {viewProfile.time_slots && viewProfile.time_slots.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Available Slots</p>
                <div className="flex flex-wrap gap-2">
                  {viewProfile.time_slots.map(slot => (
                    <span key={slot} className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">{slot}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setViewProfile(null)}>Close</Button>
              <Button className="flex-1 gap-2" disabled={!viewProfile.available} onClick={() => { setViewProfile(null); setSelectedDoctor(viewProfile); }}>
                <CalendarDays className="w-4 h-4" /> Book Appointment
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedDoctor(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            {bookingSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">Appointment Booked!</h3>
                <p className="text-muted-foreground mb-4">Your appointment has been confirmed.</p>
                {bookingDetails && (
                  <div className="bg-success/5 rounded-xl p-4 text-left space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Doctor:</span><span className="font-medium">{bookingDetails.doctor}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date:</span><span className="font-medium">{bookingDetails.date}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Time:</span><span className="font-medium">{bookingDetails.time}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fee:</span><span className="font-medium text-success">₹{bookingDetails.fees}</span></div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <h3 className="font-heading text-lg font-bold text-foreground mb-1">Book Appointment</h3>
                <p className="text-sm text-muted-foreground mb-4">with {selectedDoctor.name} - {selectedDoctor.specialization}</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Date</label>
                    <Input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Time Slot</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(selectedDoctor.time_slots || ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM']).map(t => (
                        <button key={t} onClick={() => setBookingTime(t)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${bookingTime === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Type</label>
                    <div className="flex gap-2">
                      {['Consultation', 'Follow-up', 'Check-up'].map(t => (
                        <button key={t} onClick={() => setBookingType(t)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${bookingType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
                    <textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Describe your symptoms or reason..."
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none h-20" />
                  </div>
                  <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Consultation Fee</span>
                    <span className="font-heading font-bold text-primary">₹{selectedDoctor.consultation_fees || selectedDoctor.fees || 0}</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedDoctor(null)}>Cancel</Button>
                  <Button className="flex-1 gap-2" onClick={handleBook} disabled={!bookingDate || !bookingTime}>
                    <CalendarDays className="w-4 h-4" /> Confirm Booking
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
