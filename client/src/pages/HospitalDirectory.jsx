import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, MapPin, Star, Search, ArrowRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const SPECIALTIES = ['All', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Oncology', 'General Medicine', 'ENT'];

export default function HospitalDirectory() {
  const [hospitals, setHospitals] = useState([]);
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [specFilter, setSpecFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const loadHospitals = async () => {
    setLoading(true);
    try {
      const data = await api.getHospitals({
        search: search || undefined,
        city: cityFilter !== 'All' ? cityFilter : undefined,
        specialty: specFilter !== 'All' ? specFilter : undefined,
        status: 'approved',
      });
      setHospitals(data);
      const uniqueCities = [...new Set(data.map(h => h.city).filter(Boolean))].sort();
      if (cities.length === 0) setCities(uniqueCities);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadHospitals(); }, [search, cityFilter, specFilter]);

  const truncate = (text, len = 100) => text?.length > len ? text.slice(0, len) + '...' : text;

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-warning fill-warning' : 'text-muted'}`} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Hospital Directory</h1>
        <p className="text-muted-foreground">Browse and find the best hospitals near you</p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by hospital name or city..."
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" className="sm:hidden gap-2" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>

        <div className={`space-y-3 ${showFilters ? 'block' : 'hidden sm:block'}`}>
          {cities.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setCityFilter('All')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${cityFilter === 'All' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  All Cities
                </button>
                {cities.map(c => (
                  <button key={c} onClick={() => setCityFilter(c)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${cityFilter === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Specialty</label>
            <div className="flex gap-2 flex-wrap">
              {SPECIALTIES.map(s => (
                <button key={s} onClick={() => setSpecFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${specFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hospital Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : hospitals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No hospitals found matching your criteria</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map((h, i) => (
            <motion.div
              key={h._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:shadow-primary/5 transition-all flex flex-col"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-semibold text-foreground truncate">{h.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{h.city}{h.state ? `, ${h.state}` : ''}</span>
                  </div>
                </div>
                <Badge variant={h.status === 'approved' ? 'default' : 'secondary'} className="capitalize text-xs">
                  {h.status}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {renderStars(h.rating)}
                <span className="text-xs text-muted-foreground">
                  {h.rating > 0 ? `${h.rating} (${h.reviewsCount || 0} reviews)` : 'No reviews'}
                </span>
              </div>

              {h.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {h.specialties.slice(0, 4).map(s => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                  {h.specialties.length > 4 && (
                    <Badge variant="secondary" className="text-xs">+{h.specialties.length - 4}</Badge>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-4 flex-1">
                {truncate(h.description, 100)}
              </p>

              <Link to={`/hospitals/${h._id}`} className="block">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  View Profile <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
