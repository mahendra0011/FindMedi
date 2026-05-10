import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, TestTube, Heart, Droplets, Thermometer, Calendar, CheckCircle, Loader2, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const serviceIcons = {
  bp_check: Thermometer,
  blood_sugar: Droplets,
  fbc: Activity,
  xray: TestTube,
  ecg: Heart,
  urine_test: Droplets,
  lipid_profile: Activity,
  thyroid: TestTube,
};

const categoryColors = {
  Basic: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Lab: 'bg-green-500/10 text-green-500 border-green-500/20',
  Imaging: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  Cardiac: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function PatientServices() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await api.getLabServices();
      setServices(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const toggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const handleBook = async () => {
    if (selectedServices.length === 0) return;
    setBooking(true);
    try {
      await api.createBill({
        patient: user?.name,
        patientId: user?.id || user?._id,
        doctor: 'Lab Services',
        service: selectedServices.map(s => s.name).join(', '),
        amount: totalAmount,
        services: selectedServices,
        source: 'lab',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending'
      });
      setSuccess(true);
      setSelectedServices([]);
    } catch (e) { console.error(e); }
    setBooking(false);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Service Booked!</h2>
        <p className="text-muted-foreground mb-6">Your lab services have been booked. Check billing for payment.</p>
        <Button onClick={() => setSuccess(false)}>Book More Services</Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Lab Services</h1>
        <p className="text-muted-foreground">Book lab tests and diagnostics</p>
      </div>

      {/* Selected Services Summary */}
      {selectedServices.length > 0 && (
        <div className="bg-card rounded-2xl border border-primary/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-foreground">Selected Services ({selectedServices.length})</p>
              <p className="text-sm text-muted-foreground">Total: Rs {totalAmount}</p>
            </div>
            <Button onClick={handleBook} disabled={booking} className="gap-2">
              {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              {booking ? 'Booking...' : 'Book Now'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedServices.map(s => (
              <span key={s.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {s.name} - Rs {s.price}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service, i) => {
          const Icon = serviceIcons[service.id] || TestTube;
          const isSelected = selectedServices.some(s => s.id === service.id);
          const colorClass = categoryColors[service.category] || 'bg-muted text-muted-foreground';
          
          return (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggleService(service)}
              className={`bg-card rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5 shadow-lg' 
                  : 'border-border/60 hover:border-primary/30 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">{service.name}</h3>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>{service.category}</span>
                <span className="font-bold text-foreground flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" />{service.price}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedServices.length === 0 && (
        <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed">
          <TestTube className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>Click on services to select them</p>
        </div>
      )}
    </div>
  );
}
