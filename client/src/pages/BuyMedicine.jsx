import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Truck, Phone, Mail, Star, Clock, BadgeCheck, Store, ShoppingCart, Zap, Home, Pill, Eye, ArrowRight, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MOCK_STORES = [
  { id:'s1', name:'MedPlus Pharmacy', photo:'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=300&fit=crop', verified:true, open:true, type:'Pharmacy', rating:4.5, reviews:120, tags:['24x7','Home Delivery','Generic'], deliveryTime:'25 mins', phone:'9876543210', email:'store@medplus.com', address:'123, Health Avenue, Block C, Downtown, New York', deliveryCharges:20, freeDeliveryAbove:200, city:'New York' },
  { id:'s2', name:'HealthFirst Medicals', photo:'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=300&fit=crop', verified:true, open:true, type:'Medical Store', rating:4.2, reviews:89, tags:['Home Delivery','Generic'], deliveryTime:'30 mins', phone:'9876543211', email:'info@healthfirst.com', address:'456, Wellness Road, Sector 7, Los Angeles', deliveryCharges:15, freeDeliveryAbove:150, city:'New York' },
  { id:'s3', name:'City Drug House', photo:'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', verified:false, open:false, type:'Pharmacy', rating:4.0, reviews:45, tags:['24x7'], deliveryTime:'40 mins', phone:'9876543212', email:'citydrug@email.com', address:'789, Market Street, Chicago', deliveryCharges:25, freeDeliveryAbove:300, city:'New York' },
  { id:'s4', name:'Apollo Pharmacy', photo:'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop', verified:true, open:true, type:'Pharmacy', rating:4.8, reviews:210, tags:['24x7','Home Delivery','Generic'], deliveryTime:'20 mins', phone:'9876543213', email:'care@apollopharm.com', address:'12, Health Hub, Downtown, Los Angeles', deliveryCharges:0, freeDeliveryAbove:0, city:'Los Angeles' },
  { id:'s5', name:'Wellness Mart', photo:'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400&h=300&fit=crop', verified:true, open:true, type:'Medical Store', rating:4.3, reviews:67, tags:['Home Delivery'], deliveryTime:'35 mins', phone:'9876543214', email:'hello@wellnessmart.com', address:'321, Green Park, Los Angeles', deliveryCharges:10, freeDeliveryAbove:100, city:'Los Angeles' },
  { id:'s6', name:'Generic Medicos', photo:'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop', verified:false, open:false, type:'Pharmacy', rating:3.8, reviews:32, tags:['Generic'], deliveryTime:'45 mins', phone:'9876543215', email:'info@genericmed.com', address:'555, Pharma Street, Chicago', deliveryCharges:30, freeDeliveryAbove:500, city:'Chicago' },
];

export default function BuyMedicine() {
  const navigate = useNavigate();
  const selectedCity = localStorage.getItem('mediCore_city') || '';
  const [search, setSearch] = useState('');

  const stores = MOCK_STORES.filter(s => {
    if (selectedCity && !s.city.toLowerCase().includes(selectedCity.toLowerCase())) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30')} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Buy Medicine</h1>
          <p className="text-muted-foreground mt-1">
            {selectedCity ? `Medical stores in ${selectedCity}` : 'Browse medical stores near you'}
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search medical stores..." className="pl-12 h-12 text-base rounded-2xl" />
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
                {/* Cover Image */}
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

                {/* Card Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {store.tags.includes('24x7') && <Badge variant="secondary" className="text-[10px] bg-muted/50"><Zap className="w-3 h-3 mr-1" />24x7</Badge>}
                    {store.tags.includes('Home Delivery') && <Badge variant="secondary" className="text-[10px] bg-muted/50"><Home className="w-3 h-3 mr-1" />Home Delivery</Badge>}
                    {store.tags.includes('Generic') && <Badge variant="secondary" className="text-[10px] bg-muted/50"><Pill className="w-3 h-3 mr-1" />Generic</Badge>}
                    <Badge variant="secondary" className="text-[10px] bg-muted/50"><MapPin className="w-3 h-3 mr-1" />{store.city}</Badge>
                  </div>

                  {/* Quick Info */}
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

                  {/* Delivery Charges */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <span className="text-sm text-muted-foreground">Delivery Charges</span>
                    <span className="font-bold text-base text-primary">
                      {store.deliveryCharges === 0 ? 'Free' : `\u20B9${store.deliveryCharges}`}
                      {store.freeDeliveryAbove > 0 && <span className="text-xs font-normal text-muted-foreground ml-1">(Free above \u20B9{store.freeDeliveryAbove})</span>}
                    </span>
                  </div>

                  {/* Rating + Reviews */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="flex">{renderStars(store.rating)}</div>
                      <span className="text-sm font-bold text-foreground">{store.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{store.reviews} review{store.reviews > 1 ? 's' : ''}</span>
                  </div>

                  {/* Two buttons */}
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
