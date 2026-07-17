import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Package, CheckCircle2, Clock, Truck, Home, Store, BadgeCheck, Phone, MapPin, ArrowLeft, ChevronDown, ChevronUp, FileText, RotateCcw, XCircle, MessageSquare, AlertCircle, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

function generateTimestamps(hasRx) {
  const now = new Date();
  const t = (offset) => { const d = new Date(now.getTime() - offset * 60000); return d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }); };
  return [
    { key:'placed', label:'Order Placed', icon: Package, time: t(60) },
    ...(hasRx ? [{ key:'verified', label:'Prescription Verified', icon: CheckCircle2, time: t(55) }] : []),
    { key:'confirmed', label:'Confirmed by Store', icon: Store, time: t(45) },
    { key:'packed', label:'Packed', icon: Package, time: t(35) },
    { key:'out_for_delivery', label:'Out for Delivery', icon: Truck, time: t(25) },
    { key:'delivered', label:'Delivered', icon: Home, time: null },
  ];
}

const MOCK_STORES = [
  { id:'s1', name:'MedPlus Pharmacy', photo:'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=200&h=200&fit=crop', verified:true, phone:'9876543210' },
  { id:'s2', name:'HealthFirst Medicals', photo:'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=200&h=200&fit=crop', verified:true, phone:'9876543211' },
  { id:'s3', name:'City Drug House', photo:'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=200&h=200&fit=crop', verified:false, phone:'9876543212' },
];

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addItem } = useCart();
  const hasRx = searchParams.get('rx') === 'true';
  const storeId = searchParams.get('storeId');
  const store = MOCK_STORES.find(s => s.id === storeId) || MOCK_STORES[0];
  const STAGES = generateTimestamps(hasRx);
  const [currentStage, setCurrentStage] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStage(p => {
        if (p >= STAGES.length - 2) { clearInterval(timer); return p; }
        return p + 1;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [STAGES.length]);

  const canCancel = currentStage <= Math.min(2, STAGES.length - 4);
  const isDelivered = currentStage >= STAGES.length - 1;

  const handleReorder = () => {
    const sampleItems = [
      { id:'m1', name:'Paracetamol 500mg', image:'', brand:'XYZ Pharma', mrp:45, price:29, discount:35, inStock:true, rx:false, pack:'10 tablets', category:'OTC' },
      { id:'m2', name:'Vitamin C 1000mg', image:'', brand:'HealthPlus', mrp:599, price:399, discount:33, inStock:true, rx:false, pack:'60 tablets', category:'Vitamins' },
    ];
    sampleItems.forEach(item => addItem(item, 's1'));
    toast.success('Previous order items added to cart');
    navigate('/cart');
  };

  const handleCancelOrder = () => {
    setShowCancelConfirm(false);
    toast.success('Order cancelled successfully. Refund will be processed within 3-5 business days.');
  };

  const handleSubmitReview = () => {
    if (reviewRating === 0) { alert('Please select a rating'); return; }
    toast.success(`Thank you! Your ${reviewRating}-star review has been submitted.`);
    setShowReviewModal(false);
    setReviewRating(0);
  };

  const handleSubmitReturn = () => {
    if (!returnReason) { alert('Please select a return reason'); return; }
    toast.success(`Return request submitted: ${returnReason}. We will contact you within 24 hours.`);
    setShowReturnModal(false);
    setReturnReason('');
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">Track Order</h1>
          <Badge className="mt-2 text-sm font-mono bg-primary/10 text-primary border-primary/20">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> {orderId || `ORD${Date.now().toString(36).toUpperCase()}`}
          </Badge>
        </div>

        {/* Store Info */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted/50 overflow-hidden border border-border/40 shrink-0">
            <img src={store.photo} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-heading font-semibold text-foreground">{store.name}</h3>
              {store.verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" /> {store.phone}
            </p>
          </div>
          <Badge className={cn('text-xs px-3 py-1', isDelivered ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary')}>
            {isDelivered ? 'Delivered' : STAGES[currentStage]?.label || 'Processing'}
          </Badge>
        </div>

        {/* Timeline */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 mb-6">
          <h3 className="font-heading font-semibold text-foreground mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Order Timeline
          </h3>
          <div className="space-y-0">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isActive = i <= currentStage;
              const isCurrent = i === currentStage;
              const isPast = i < currentStage;

              return (
                <div key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all', 
                      isPast ? 'bg-primary border-primary text-primary-foreground' :
                      isCurrent ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20' :
                      'bg-card border-muted-foreground/20 text-muted-foreground')}>
                      {isPast || isCurrent ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className={cn('w-0.5 h-10', isPast ? 'bg-primary' : 'bg-muted-foreground/15')} />
                    )}
                  </div>
                  <div className={cn('pb-8', i === STAGES.length - 1 && 'pb-0')}>
                    <div className="flex items-center gap-2">
                      <p className={cn('font-medium text-sm', isActive ? 'text-foreground' : 'text-muted-foreground/50')}>
                        {stage.label}
                      </p>
                      {stage.time && isPast && (
                        <span className="text-[10px] text-muted-foreground">{stage.time}</span>
                      )}
                    </div>
                    {isCurrent && !isDelivered && (
                      <p className="text-xs text-primary mt-0.5 animate-pulse">In progress...</p>
                    )}
                    {i === 0 && isDelivered && (
                      <p className="text-xs text-emerald-600 mt-0.5">Delivered successfully</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">Delivery Address</h4>
              <p className="text-sm text-muted-foreground mt-1">123, Health Avenue, Block C, Downtown, New York, NY 10001</p>
            </div>
          </div>
          <Separator className="mb-4" />
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">Delivery Partner</h4>
              <p className="text-sm text-muted-foreground mt-1">MediCore Logistics - Partner ID: MC-9876</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden mb-6">
          <button onClick={() => setShowActions(!showActions)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
            <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" /> Order Actions
            </h3>
            {showActions ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showActions && (
            <div className="px-5 pb-5 space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => window.print()}>
                <FileText className="w-4 h-4 text-primary" /> Download Invoice
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={handleReorder}>
                <RotateCcw className="w-4 h-4 text-primary" /> Reorder
              </Button>
              {canCancel ? (
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl text-red-500 hover:text-red-600 hover:border-red-200"
                  onClick={() => setShowCancelConfirm(true)}>
                  <XCircle className="w-4 h-4" /> Cancel Order
                </Button>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">Order cannot be cancelled at this stage. It has already been packed/dispatched.</p>
                </div>
              )}
              {isDelivered && (
                <>
                  <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => setShowReturnModal(true)}>
                    <XCircle className="w-4 h-4 text-primary" /> Return / Replace
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => setShowReviewModal(true)}>
                    <MessageSquare className="w-4 h-4 text-primary" /> Rate & Review
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Cancel Confirmation */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCancelConfirm(false)}>
            <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-center text-foreground mb-2">Cancel Order?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">This action cannot be undone. A full refund will be processed within 3-5 business days.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCancelConfirm(false)}>Keep Order</Button>
                <Button variant="destructive" className="flex-1 rounded-xl gap-2" onClick={handleCancelOrder}>
                  <XCircle className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowReviewModal(false)}>
            <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-center text-foreground mb-4">Rate Your Order</h3>
              <div className="flex justify-center gap-2 mb-6">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)}
                    className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all', s <= reviewRating ? 'text-amber-400' : 'text-muted-foreground/30')}>
                    <Star className={cn('w-6 h-6', s <= reviewRating && 'fill-amber-400')} />
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowReviewModal(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl" onClick={handleSubmitReview}>Submit Review</Button>
              </div>
            </div>
          </div>
        )}

        {/* Return Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowReturnModal(false)}>
            <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-center text-foreground mb-4">Return / Replace</h3>
              <p className="text-sm text-muted-foreground mb-4">Why are you returning this order?</p>
              <div className="space-y-2 mb-6">
                {['Damaged item received', 'Wrong item delivered', 'Expired product', 'Item missing from package', 'Other reason'].map(r => (
                  <button key={r} onClick={() => setReturnReason(r)}
                    className={cn('w-full text-left p-3 rounded-xl border text-sm transition-all', returnReason === r ? 'border-primary bg-primary/5 text-foreground' : 'border-border/60 text-muted-foreground')}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowReturnModal(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl" onClick={handleSubmitReturn} disabled={!returnReason}>Submit Request</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
