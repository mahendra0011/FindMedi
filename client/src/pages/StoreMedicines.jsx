import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Store, Star, ShoppingCart, Lock, Plus, Minus, Pill, BadgeCheck, Percent, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

const MOCK_STORES = [
  { id:'s1', name:'MedPlus Pharmacy', photo:'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&h=300&fit=crop', verified:true },
  { id:'s2', name:'HealthFirst Medicals', photo:'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=400&h=300&fit=crop', verified:true },
  { id:'s3', name:'City Drug House', photo:'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop', verified:false },
];

const MOCK_MEDICINES = [
  { id:'m1', name:'Paracetamol 500mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'XYZ Pharma', mrp:45, price:29, discount:35, inStock:true, rx:false, pack:'10 tablets', category:'OTC', storeId:'s1' },
  { id:'m2', name:'Vitamin C 1000mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'HealthPlus', mrp:599, price:399, discount:33, inStock:true, rx:false, pack:'60 tablets', category:'Vitamins', storeId:'s1' },
  { id:'m3', name:'Cough Syrup 100ml', image:'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200&h=200&fit=crop', brand:'MediCare', mrp:120, price:89, discount:26, inStock:true, rx:false, pack:'100ml bottle', category:'OTC', storeId:'s1' },
  { id:'m4', name:'Amoxicillin 500mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'BioPharma', mrp:180, price:145, discount:19, inStock:true, rx:true, pack:'15 capsules', category:'Prescription', storeId:'s1' },
  { id:'m5', name:'Azithromycin 500mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'PharmaCorp', mrp:250, price:199, discount:20, inStock:false, rx:true, pack:'6 tablets', category:'Prescription', storeId:'s1' },
  { id:'m6', name:'BP Monitor', image:'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=200&h=200&fit=crop', brand:'HealthTech', mrp:2999, price:2499, discount:17, inStock:true, rx:false, pack:'1 unit', category:'Devices', storeId:'s1' },
  { id:'m7', name:'Baby Diapers M', image:'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=200&h=200&fit=crop', brand:'BabySoft', mrp:499, price:399, discount:20, inStock:true, rx:false, pack:'30 pieces', category:'Baby Care', storeId:'s1' },
  { id:'m8', name:'Multivitamin', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'NutriFit', mrp:450, price:349, discount:22, inStock:true, rx:false, pack:'30 tablets', category:'Vitamins', storeId:'s1' },
  { id:'m12', name:'Chyawanprash', image:'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200&h=200&fit=crop', brand:'HerbalLife', mrp:350, price:299, discount:15, inStock:true, rx:false, pack:'500g jar', category:'Ayurvedic', storeId:'s1' },
  { id:'m16', name:'Protein Powder', image:'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200&h=200&fit=crop', brand:'NutriFit', mrp:1599, price:1299, discount:19, inStock:true, rx:false, pack:'1kg container', category:'Vitamins', storeId:'s1' },
  { id:'m17', name:'Aspirin 75mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'XYZ Pharma', mrp:30, price:18, discount:40, inStock:true, rx:false, pack:'14 tablets', category:'OTC', storeId:'s1' },
  { id:'m18', name:'Dolo 650', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'Micro Labs', mrp:55, price:35, discount:36, inStock:true, rx:false, pack:'15 tablets', category:'OTC', storeId:'s1' },
  { id:'m9', name:'Ibuprofen 400mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'XYZ Pharma', mrp:65, price:45, discount:31, inStock:true, rx:false, pack:'10 tablets', category:'OTC', storeId:'s2' },
  { id:'m10', name:'Cetirizine 10mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'AllerCare', mrp:35, price:24, discount:31, inStock:true, rx:false, pack:'10 tablets', category:'OTC', storeId:'s2' },
  { id:'m11', name:'Metformin 500mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'DiabeCare', mrp:90, price:68, discount:24, inStock:true, rx:true, pack:'20 tablets', category:'Prescription', storeId:'s2' },
  { id:'m13', name:'Glucose Powder', image:'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200&h=200&fit=crop', brand:'Energize', mrp:120, price:89, discount:26, inStock:true, rx:false, pack:'500g pouch', category:'OTC', storeId:'s2' },
  { id:'m14', name:'Digital Thermometer', image:'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=200&h=200&fit=crop', brand:'HealthTech', mrp:299, price:199, discount:33, inStock:true, rx:false, pack:'1 unit', category:'Devices', storeId:'s2' },
  { id:'m15', name:'Omeprazole 20mg', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'GastroCare', mrp:85, price:59, discount:31, inStock:false, rx:false, pack:'10 capsules', category:'OTC', storeId:'s3' },
  { id:'m19', name:'Betadine Solution', image:'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200&h=200&fit=crop', brand:'Win Medicare', mrp:120, price:89, discount:26, inStock:true, rx:false, pack:'100ml bottle', category:'OTC', storeId:'s3' },
  { id:'m20', name:'Vitamin D3 60K', image:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop', brand:'HealthPlus', mrp:199, price:149, discount:25, inStock:true, rx:false, pack:'4 capsules', category:'Vitamins', storeId:'s3' },
];

const CATEGORIES = ['All', 'Prescription', 'OTC', 'Generic', 'Baby Care', 'Ayurvedic', 'Devices', 'Vitamins'];

export default function StoreMedicines() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const store = MOCK_STORES.find(s => s.id === storeId) || MOCK_STORES[0];
  const allMeds = MOCK_MEDICINES.filter(m => m.storeId === storeId);
  const { cart, addItem, updateQty, entries } = useCart();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const storeEntries = entries.filter(e => e.storeId === storeId);
  const filteredMeds = allMeds.filter(m => {
    if (catFilter !== 'All' && m.category !== catFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.brand.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sections = [
    { key: 'general', label: 'General Medicines', filter: (m) => !m.rx && (m.category === 'OTC' || m.category === 'Generic' || m.category === 'Ayurvedic') },
    { key: 'prescription', label: 'Prescription Required', filter: (m) => m.rx },
    { key: 'items', label: 'General Items', filter: (m) => !m.rx && (m.category === 'Devices' || m.category === 'Baby Care' || m.category === 'Vitamins') },
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button onClick={() => navigate(`/buy-medicine/${storeId}`)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Store Details
        </button>

        {/* Store Info Mini Header */}
        <div className="flex items-center gap-4 bg-card rounded-2xl border border-border/50 p-4 mb-6">
          <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/40 shrink-0">
            <img src={store.photo} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-xl text-foreground truncate">{store.name}</h1>
              {store.verified && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{allMeds.length} Medicines</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg shrink-0" onClick={() => navigate(`/buy-medicine/${storeId}`)}>
            <Store className="w-3.5 h-3.5" /> Store Details
          </Button>
        </div>

        {/* Upload Prescription CTA */}
        <button onClick={() => { const inStock = allMeds.filter(m => m.inStock); inStock.forEach(m => addItem(m, storeId)); toast.success(`${inStock.length} items added to cart`); navigate('/cart'); }} className="w-full text-left mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-card rounded-2xl border border-primary/20 p-5 hover:shadow-lg hover:border-primary/40 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading font-bold text-base text-foreground">Upload Prescription</h3>
              <p className="text-xs text-muted-foreground">Buy all medicines in single click &rarr;</p>
            </div>
            <ChevronRight className="w-5 h-5 text-primary/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </button>

        {/* Search + Categories */}
        <div className="mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search in ${store.name}...`} className="pl-10 h-11 text-sm rounded-xl bg-card border-border/50" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={cn('px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border', catFilter === c ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' : 'bg-card text-muted-foreground hover:text-foreground border-border/50')}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {filteredMeds.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No medicines found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map(section => {
              const items = filteredMeds.filter(section.filter);
              if (items.length === 0) return null;
              return (
                <div key={section.key}>
                  <h3 className="font-heading font-bold text-base text-foreground mb-3">{section.label} ({items.length})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {items.map(med => {
                      const entry = storeEntries.find(e => e.item.id === med.id);
                      return (
                        <div key={med.id} className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all group/card flex flex-col">
                          <div className="relative h-28 sm:h-32 bg-gradient-to-br from-muted/50 to-muted/10 overflow-hidden">
                            <img src={med.image} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105" />
                            {med.discount > 0 && (
                              <span className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow">
                                {med.discount}% OFF
                              </span>
                            )}
                            {med.rx && (
                              <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Rx
                              </span>
                            )}
                          </div>
                          <div className="p-2.5 sm:p-3 flex-1 flex flex-col">
                            <h4 className="font-heading font-semibold text-xs sm:text-sm text-foreground leading-tight line-clamp-1">{med.name}</h4>
                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">{med.brand} | {med.pack}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="text-sm sm:text-base font-bold text-foreground">₹{med.price}</span>
                              {med.mrp > med.price && <span className="text-[10px] sm:text-xs text-muted-foreground line-through">₹{med.mrp}</span>}
                            </div>
                            <span className={cn('text-[10px] font-medium mt-1', med.inStock ? 'text-emerald-600' : 'text-red-500')}>
                              {med.inStock ? '✓ In Stock' : '✕ Out of Stock'}
                            </span>
                            <div className="mt-auto pt-2">
                              {med.rx ? (
                                <Button size="sm" className="w-full gap-1 rounded-lg text-[10px] h-7 sm:h-8 bg-amber-500 hover:bg-amber-600 text-white"
                                  onClick={() => {
                                    const rxMeds = allMeds.filter(m => m.rx && m.inStock);
                                    if (rxMeds.length > 0) {
                                      rxMeds.forEach(m => addItem(m, storeId));
                                      toast.success(`${rxMeds.length} Rx item(s) added — upload prescription at checkout`);
                                      navigate('/cart');
                                    } else {
                                      toast.error('No prescription items available');
                                    }
                                  }}>
                                  <Lock className="w-3 h-3" /> Upload Rx
                                </Button>
                              ) : entry ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(entry.key, entry.qty - 1)} disabled={entry.qty <= 1}>
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-6 text-center text-xs font-bold">{entry.qty}</span>
                                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => addItem(med, storeId)} disabled={!med.inStock}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Button size="sm" className="w-full gap-1 rounded-lg text-[10px] h-7 sm:h-8" disabled={!med.inStock} onClick={() => { addItem(med, storeId); toast.success(`${med.name} added to cart`); }}>
                                  <ShoppingCart className="w-3 h-3" /> Add
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
