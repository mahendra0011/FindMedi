import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Truck, Phone, Mail, Star, Clock, BadgeCheck, Store, ShoppingCart, Zap, Home, Pill, Eye, ArrowRight, MapPin, ZapOff, SlidersHorizontal, X, ArrowUpDown, IndianRupee, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const LOCALITIES = ['Vijay Nagar', 'Civil Lines', 'Napier Town', 'Marhatal', 'Gol Bazar', 'Sadar Cantt'];

const DELIVERY_TIME_RANGES = [
  { label: '0-20 min', min: 0, max: 20 },
  { label: '20-30 min', min: 20, max: 30 },
  { label: '30-45 min', min: 30, max: 45 },
];

const parseMinutes = (str) => parseInt(str) || 0;

function getLocality(address) {
  const match = LOCALITIES.find(l => address.toLowerCase().includes(l.toLowerCase()));
  return match || '';
}

export default function BuyMedicine() {
  const navigate = useNavigate();
  const selectedCity = localStorage.getItem('mediCore_city') || '';
  const [allStores, setAllStores] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getPharmacies({ limit: 50 });
        const list = Array.isArray(res) ? res : res?.pharmacies || res?.data || [];
        if (list.length > 0) {
          const mapped = list.map(p => ({
            id: p._id || p.id,
            _id: p._id,
            name: p.name,
            photo: p.photo || 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=300&fit=crop',
            verified: p.verified || p.status === 'approved',
            open: p.open ?? true,
            type: p.type || 'Pharmacy',
            rating: p.rating || 4.0,
            reviews: p.reviewsCount || p.reviews || 0,
            tags: p.tags || ['Home Delivery'],
            deliveryTime: p.deliveryTime || '30 mins',
            phone: p.phone || '',
            email: p.email || '',
            address: p.address || '',
            deliveryCharges: p.deliveryCharges ?? 0,
            freeDeliveryAbove: p.freeDeliveryAbove ?? 0,
            city: p.city || '',
          }));
          setAllStores(mapped);
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  // Quick filters
  const [search, setSearch] = useState('');
  const [openNow, setOpenNow] = useState(false);
  const [filter24x7, setFilter24x7] = useState(false);
  const [homeDelivery, setHomeDelivery] = useState(false);
  const [genericOnly, setGenericOnly] = useState(false);
  const [quickRating, setQuickRating] = useState(0);
  const [sortBy, setSortBy] = useState('');

  // Advanced filter panel
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [storeType, setStoreType] = useState('');
  const [locality, setLocality] = useState('');
  const [deliveryTimeRange, setDeliveryTimeRange] = useState(null);
  const [deliveryChargeFilter, setDeliveryChargeFilter] = useState('');
  const [freeDeliveryAboveFilter, setFreeDeliveryAboveFilter] = useState(null);
  const [minReviews, setMinReviews] = useState(0);
  const [ratingMin, setRatingMin] = useState(0);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);

  const quickActive = [openNow, filter24x7, homeDelivery, genericOnly, quickRating > 0].filter(Boolean).length;

  const resetAdvanced = () => {
    setStoreType('');
    setLocality('');
    setDeliveryTimeRange(null);
    setDeliveryChargeFilter('');
    setFreeDeliveryAboveFilter(null);
    setMinReviews(0);
    setRatingMin(0);
    setHasPhone(false);
    setHasEmail(false);
  };

  const stores = useMemo(() => {
    let result = allStores.filter(s => {
      if (selectedCity && !s.city.toLowerCase().includes(selectedCity.toLowerCase())) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (openNow && !s.open) return false;
      if (filter24x7 && !s.tags.includes('24x7')) return false;
      if (homeDelivery && !s.tags.includes('Home Delivery')) return false;
      if (genericOnly && !s.tags.includes('Generic')) return false;
      if (quickRating > 0 && s.rating < quickRating) return false;
      if (storeType && s.type !== storeType) return false;
      if (locality && !getLocality(s.address).toLowerCase().includes(locality.toLowerCase())) return false;
      if (deliveryTimeRange) {
        const mins = parseMinutes(s.deliveryTime);
        if (mins < deliveryTimeRange.min || mins > deliveryTimeRange.max) return false;
      }
      if (deliveryChargeFilter === 'free' && s.deliveryCharges !== 0) return false;
      if (deliveryChargeFilter === 'low' && (s.deliveryCharges <= 0 || s.deliveryCharges > 20)) return false;
      if (deliveryChargeFilter === 'medium' && (s.deliveryCharges <= 20 || s.deliveryCharges > 50)) return false;
      if (freeDeliveryAboveFilter !== null && (s.freeDeliveryAbove <= 0 || s.freeDeliveryAbove > freeDeliveryAboveFilter)) return false;
      if (minReviews > 0 && s.reviews < minReviews) return false;
      if (ratingMin > 0 && s.rating < ratingMin) return false;
      if (hasPhone && !s.phone) return false;
      if (hasEmail && !s.email) return false;
      return true;
    });

    if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'delivery') result.sort((a, b) => parseMinutes(a.deliveryTime) - parseMinutes(b.deliveryTime));
    else if (sortBy === 'nearest') result.sort((a, b) => parseMinutes(a.deliveryTime) - parseMinutes(b.deliveryTime));

    return result;
  }, [allStores, selectedCity, search, openNow, filter24x7, homeDelivery, genericOnly, quickRating, sortBy, storeType, locality, deliveryTimeRange, deliveryChargeFilter, freeDeliveryAboveFilter, minReviews, ratingMin, hasPhone, hasEmail]);

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30')} />
      ))}
    </div>
  );

  const FilterChip = ({ active, onClick, children }) => (
    <button onClick={onClick}
      className={cn('px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all shrink-0 border', active ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-muted-foreground hover:text-foreground border-border/50')}>
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-foreground">Buy Medicine</h1>
          <p className="text-muted-foreground mt-1">
            {selectedCity ? `Medical stores in ${selectedCity}` : 'Browse medical stores near you'}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search medical stores..." className="pl-12 h-12 text-base rounded-2xl" />
        </div>

        {/* ═══ Quick Filters ═══ */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <FilterChip active={openNow} onClick={() => setOpenNow(!openNow)}>
            <Clock className="w-3 h-3 inline mr-1" /> Open Now
          </FilterChip>
          <FilterChip active={filter24x7} onClick={() => setFilter24x7(!filter24x7)}>
            <Zap className="w-3 h-3 inline mr-1" /> 24x7
          </FilterChip>
          <FilterChip active={homeDelivery} onClick={() => setHomeDelivery(!homeDelivery)}>
            <Truck className="w-3 h-3 inline mr-1" /> Home Delivery
          </FilterChip>
          <FilterChip active={genericOnly} onClick={() => setGenericOnly(!genericOnly)}>
            <Pill className="w-3 h-3 inline mr-1" /> Generic
          </FilterChip>
          <FilterChip active={quickRating === 4} onClick={() => setQuickRating(quickRating === 4 ? 0 : 4)}>
            <Star className="w-3 h-3 inline mr-1" /> 4★ & above
          </FilterChip>
          <FilterChip active={quickRating === 4.5} onClick={() => setQuickRating(quickRating === 4.5 ? 0 : 4.5)}>
            <Star className="w-3 h-3 inline mr-1" /> 4.5★ & above
          </FilterChip>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="h-8 px-2.5 rounded-xl text-[11px] font-medium bg-card border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0">
            <option value="">Sort: Default</option>
            <option value="rating">Rating</option>
            <option value="delivery">Delivery Time</option>
            <option value="nearest">Nearest</option>
          </select>

          <button onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition-all shrink-0', showAdvanced || storeType || locality || deliveryTimeRange || deliveryChargeFilter || minReviews > 0 || ratingMin > 0 || hasPhone || hasEmail ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground hover:text-foreground border-border/50')}>
            <SlidersHorizontal className="w-3 h-3" />
            Advanced
          </button>

          {(quickActive > 0 || storeType || locality || deliveryTimeRange || deliveryChargeFilter || minReviews > 0 || ratingMin > 0 || hasPhone || hasEmail) && (
            <button onClick={() => { setOpenNow(false); setFilter24x7(false); setHomeDelivery(false); setGenericOnly(false); setQuickRating(0); setSortBy(''); resetAdvanced(); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-medium text-primary hover:text-primary/80 border border-primary/20 shrink-0 whitespace-nowrap">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* ═══ Advanced Filter Panel ═══ */}
        {showAdvanced && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border/50 p-5 mb-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Filter className="w-3.5 h-3.5 text-primary" /> Advanced Filters</h4>
              <button onClick={resetAdvanced} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                <X className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Store Type */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Store Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Pharmacy', 'Medical Store'].map(t => (
                    <button key={t} onClick={() => setStoreType(storeType === t ? '' : t)}
                      className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', storeType === t ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Locality */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Locality / Area</p>
                <div className="flex flex-wrap gap-1.5">
                  {LOCALITIES.map(l => (
                    <button key={l} onClick={() => setLocality(locality === l ? '' : l)}
                      className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', locality === l ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Time Range */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Delivery Time</p>
                <div className="flex flex-wrap gap-1.5">
                  {DELIVERY_TIME_RANGES.map((r, i) => (
                    <button key={i} onClick={() => setDeliveryTimeRange(deliveryTimeRange === r ? null : r)}
                      className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', deliveryTimeRange === r ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Charges */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Delivery Charges</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'free', label: 'Free' },
                    { key: 'low', label: '₹1-20' },
                    { key: 'medium', label: '₹20-50' },
                  ].map(r => (
                    <button key={r.key} onClick={() => setDeliveryChargeFilter(deliveryChargeFilter === r.key ? '' : r.key)}
                      className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', deliveryChargeFilter === r.key ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Free Delivery Above */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Free Delivery Above</p>
                <div className="flex flex-wrap gap-1.5">
                  {[100, 200, 300, 500].map(val => (
                    <button key={val} onClick={() => setFreeDeliveryAboveFilter(freeDeliveryAboveFilter === val ? null : val)}
                      className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', freeDeliveryAboveFilter === val ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min Reviews */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Min. Reviews</p>
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 200].map(val => (
                    <button key={val} onClick={() => setMinReviews(minReviews === val ? 0 : val)}
                      className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', minReviews === val ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                      {val}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating Range */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Rating (min)</p>
                <div className="flex flex-wrap gap-1.5">
                  {[3, 3.5, 4, 4.5].map(val => (
                    <button key={val} onClick={() => setRatingMin(ratingMin === val ? 0 : val)}
                      className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', ratingMin === val ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                      <Star className="w-2.5 h-2.5 inline mr-0.5" />{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">Contact</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setHasPhone(!hasPhone)}
                    className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', hasPhone ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                    <Phone className="w-2.5 h-2.5 inline mr-0.5" /> Has Phone
                  </button>
                  <button onClick={() => setHasEmail(!hasEmail)}
                    className={cn('px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all', hasEmail ? 'bg-primary/10 text-primary border-primary/30' : 'bg-background text-muted-foreground hover:text-foreground border-border/40')}>
                    <Mail className="w-2.5 h-2.5 inline mr-0.5" /> Has Email
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">{stores.length} store{stores.length !== 1 ? 's' : ''} found</p>
        </div>

        {stores.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No stores found</h3>
            <p className="text-muted-foreground text-sm">Try a different city or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stores.map((store, index) => (
              <motion.div key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col">
                <div className="relative h-44 overflow-hidden cursor-pointer" onClick={() => navigate(`/buy-medicine/${store.id}`)}>
                  <img src={store.photo} alt={store.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold border shadow-lg', store.open ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400')}>
                      {store.open ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-bold text-white text-lg drop-shadow-sm">{store.name}</h3>
                      {store.verified && <BadgeCheck className="w-5 h-5 text-primary shrink-0 drop-shadow-sm" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-white/90 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full">{store.type}</span>
                      <div className="flex items-center gap-1 text-white/80">{renderStars(store.rating)}<span className="text-xs ml-1">{store.rating}</span></div>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div className="flex flex-wrap gap-1.5">
                    {store.tags.includes('24x7') && <Badge variant="secondary" className="text-[10px] bg-muted/50"><Zap className="w-3 h-3 mr-1" />24x7</Badge>}
                    {store.tags.includes('Home Delivery') && <Badge variant="secondary" className="text-[10px] bg-muted/50"><Home className="w-3 h-3 mr-1" />Home Delivery</Badge>}
                    {store.tags.includes('Generic') && <Badge variant="secondary" className="text-[10px] bg-muted/50"><Pill className="w-3 h-3 mr-1" />Generic</Badge>}
                    <Badge variant="secondary" className="text-[10px] bg-muted/50"><MapPin className="w-3 h-3 mr-1" />{store.city}</Badge>
                  </div>

                  <div className="bg-gradient-to-br from-muted/40 to-muted/10 rounded-xl border border-border/40 p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary" />Delivery</span>
                      <span className="font-semibold text-foreground">{store.deliveryTime}</span>
                    </div>
                    <div className="h-px bg-border/30" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" />Phone</span>
                      <span className="font-semibold text-foreground">{store.phone}</span>
                    </div>
                    <div className="h-px bg-border/30" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-primary" />Email</span>
                      <span className="font-semibold text-foreground truncate">{store.email}</span>
                    </div>
                    <div className="h-px bg-border/30" />
                    <div className="flex items-start justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1.5 mt-0.5"><MapPin className="w-3.5 h-3.5 text-primary shrink-0" />Address</span>
                      <span className="font-semibold text-foreground text-right max-w-[60%]">{store.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <span className="text-sm text-muted-foreground">Delivery Charges</span>
                    <span className="font-bold text-base text-primary">
                      {store.deliveryCharges === 0 ? 'Free' : `₹${store.deliveryCharges}`}
                      {store.freeDeliveryAbove > 0 && <span className="text-xs font-normal text-muted-foreground ml-1">(Free above ₹{store.freeDeliveryAbove})</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="flex">{renderStars(store.rating)}</div>
                      <span className="text-sm font-bold text-foreground">{store.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{store.reviews} review{store.reviews > 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button className="flex-1 gap-1.5 rounded-xl" size="sm" variant="default"
                      onClick={() => navigate(`/buy-medicine/${store.id}/medicines`)}>
                      <Pill className="w-3.5 h-3.5" /> Medicines
                    </Button>
                    <Button className="flex-1 gap-1.5 rounded-xl" size="sm" variant="outline"
                      onClick={() => navigate(`/buy-medicine/${store.id}`)}>
                      <Eye className="w-3.5 h-3.5" /> More Details
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}