import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package, CheckCircle2, Clock, Truck, Home, Store, BadgeCheck,
  Phone, MapPin, ArrowLeft, ChevronDown, ChevronUp, FileText,
  RotateCcw, XCircle, MessageSquare, AlertCircle, ShoppingCart,
  Star, FlaskConical, Activity, Calendar, Bell, User, Microscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { FLOW_TYPE, TRACKING_STAGES } from '@/hooks/useBookingFlow';
import { toast } from 'sonner';

// ─── Icon map (string key → Lucide component) ─────────────────────────────────
const ICON_MAP = {
  Package, CheckCircle2, Clock, Truck, Home, Store, FlaskConical,
  Activity, FileText, Calendar, Bell, User, Microscope,
};

// ─── Mock entity data per type ─────────────────────────────────────────────────
const MOCK_STORES = [
  { id: 's1', name: 'MedPlus Pharmacy',    photo: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=200&h=200&fit=crop', verified: true,  phone: '9876543210', type: 'pharmacy' },
  { id: 's2', name: 'HealthFirst Medicals', photo: 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=200&h=200&fit=crop', verified: true,  phone: '9876543211', type: 'pharmacy' },
  { id: 's3', name: 'City Drug House',      photo: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=200&h=200&fit=crop', verified: false, phone: '9876543212', type: 'pharmacy' },
  { id: 'l1', name: 'Apollo Diagnostics',  photo: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&h=200&fit=crop', verified: true,  phone: '9876543213', type: 'lab' },
  { id: 'l2', name: 'Thyrocare Labs',       photo: 'https://images.unsplash.com/photo-1581093458791-9d42cc0a0483?w=200&h=200&fit=crop', verified: true,  phone: '9876543214', type: 'lab' },
  { id: 'c1', name: 'HealthCare Clinic',   photo: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&h=200&fit=crop', verified: true,  phone: '9876543215', type: 'clinic' },
];

// ─── Type-specific display metadata ──────────────────────────────────────────
const FLOW_META = {
  [FLOW_TYPE.MEDICINE]: {
    title:       'Track Order',
    entityLabel: 'Pharmacy',
    doneLabel:   'Delivered',
    successMsg:  'Your medicines have been delivered!',
    doneGradient:'from-emerald-50/50 to-background dark:from-emerald-950/10',
  },
  [FLOW_TYPE.TEST]: {
    title:       'Track Lab Booking',
    entityLabel: 'Lab',
    doneLabel:   'Report Ready',
    successMsg:  'Your lab report is ready! Download below.',
    doneGradient:'from-violet-50/50 to-background dark:from-violet-950/10',
  },
  [FLOW_TYPE.APPOINTMENT]: {
    title:       'Track Appointment',
    entityLabel: 'Clinic',
    doneLabel:   'Completed',
    successMsg:  'Your appointment has been completed.',
    doneGradient:'from-sky-50/50 to-background dark:from-sky-950/10',
  },
};

// ─── Progress speed per flow type (ms per stage advance) ─────────────────────
const ADVANCE_INTERVAL = {
  [FLOW_TYPE.MEDICINE]:    5000,
  [FLOW_TYPE.TEST]:        6000,
  [FLOW_TYPE.APPOINTMENT]: 7000,
};

export default function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addItem } = useCart();

  const hasRx   = searchParams.get('rx')      === 'true';
  const storeId = searchParams.get('storeId') || 's1';
  const rawType = searchParams.get('type')    || FLOW_TYPE.MEDICINE;

  // Normalise type — fall back to medicine if unknown
  const flowType = Object.values(FLOW_TYPE).includes(rawType) ? rawType : FLOW_TYPE.MEDICINE;
  const meta     = FLOW_META[flowType];

  // Build the stage list for this flow + rx combination
  const STAGES = TRACKING_STAGES[flowType](hasRx).map((s, i) => {
    const now = new Date();
    const offset = (TRACKING_STAGES[flowType](hasRx).length - 1 - i) * 8; // minutes ago
    const d = new Date(now.getTime() - offset * 60000);
    return {
      ...s,
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  });

  const store   = MOCK_STORES.find(s => s.id === storeId) || MOCK_STORES[0];

  const [currentStage,    setCurrentStage]    = useState(0);
  const [showActions,     setShowActions]     = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating,    setReviewRating]    = useState(0);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason,    setReturnReason]    = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Auto-advance stages
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStage(p => {
        if (p >= STAGES.length - 2) { clearInterval(timer); return p; }
        return p + 1;
      });
    }, ADVANCE_INTERVAL[flowType]);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowType, STAGES.length]);

  const canCancel  = currentStage <= Math.min(2, STAGES.length - 4);
  const isDone     = currentStage >= STAGES.length - 1;
  const doneLabel  = meta.doneLabel;

  const handleReorder = () => {
    const sampleItems = [
      { id: 'm1', name: 'Paracetamol 500mg', image: '', brand: 'XYZ Pharma', mrp: 45, price: 29, discount: 35, inStock: true, rx: false, pack: '10 tablets', category: 'OTC' },
      { id: 'm2', name: 'Vitamin C 1000mg',  image: '', brand: 'HealthPlus', mrp: 599, price: 399, discount: 33, inStock: true, rx: false, pack: '60 tablets', category: 'Vitamins' },
    ];
    sampleItems.forEach(item => addItem(item, 's1'));
    toast.success('Previous order items added to cart');
    navigate('/cart');
  };

  const handleCancelOrder = () => {
    setShowCancelConfirm(false);
    toast.success('Order cancelled. Refund will be processed within 3-5 business days.');
  };

  const handleSubmitReview = () => {
    if (reviewRating === 0) { toast.error('Please select a rating'); return; }
    toast.success(`Thank you! Your ${reviewRating}-star review has been submitted.`);
    setShowReviewModal(false);
    setReviewRating(0);
  };

  const handleSubmitReturn = () => {
    if (!returnReason) { toast.error('Please select a return reason'); return; }
    toast.success(`Return request submitted. We'll contact you within 24 hours.`);
    setShowReturnModal(false);
    setReturnReason('');
  };

  // ─── Stage icon resolution ──────────────────────────────────────────────────
  const resolveIcon = (iconKey) => ICON_MAP[iconKey] || Package;

  // ─── Progress percentage ───────────────────────────────────────────────────
  const progressPct = STAGES.length > 1
    ? Math.round((currentStage / (STAGES.length - 1)) * 100)
    : 100;

  return (
    <div className={cn('min-h-screen bg-gradient-to-b pb-12', isDone ? meta.doneGradient : 'from-background to-background')}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-foreground">{meta.title}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge className="text-sm font-mono bg-primary/10 text-primary border-primary/20">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {orderId || `ORD${Date.now().toString(36).toUpperCase()}`}
            </Badge>
            <Badge className={cn(
              'text-xs',
              isDone ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-blue-500/10 text-blue-600 border-blue-200'
            )}>
              {isDone ? doneLabel : `${progressPct}% complete`}
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Entity / provider card */}
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
          <Badge className={cn(
            'text-xs px-3 py-1 shrink-0',
            isDone ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : 'bg-primary/10 text-primary border-primary/20'
          )}>
            {isDone ? doneLabel : (STAGES[currentStage]?.label || 'Processing')}
          </Badge>
        </div>

        {/* Done celebration banner */}
        {isDone && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-5 mb-6 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">{doneLabel}!</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-300 mt-0.5">{meta.successMsg}</p>
              {flowType === FLOW_TYPE.TEST && (
                <Button
                  size="sm"
                  className="mt-3 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setShowReportModal(true)}
                >
                  <FileText className="w-4 h-4" /> View / Download Report
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-card rounded-2xl border border-border/60 p-6 mb-6">
          <h3 className="font-heading font-semibold text-foreground mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Order Timeline
          </h3>
          <div className="space-y-0">
            {STAGES.map((stage, i) => {
              const Icon    = resolveIcon(stage.icon);
              const isActive  = i <= currentStage;
              const isCurrent = i === currentStage;
              const isPast    = i < currentStage;

              return (
                <div key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                      isPast    ? 'bg-primary border-primary text-primary-foreground' :
                      isCurrent ? 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20' :
                                  'bg-card border-muted-foreground/20 text-muted-foreground'
                    )}>
                      {isPast || isCurrent
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                      }
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className={cn('w-0.5 h-10', isPast ? 'bg-primary' : 'bg-muted-foreground/15')} />
                    )}
                  </div>
                  <div className={cn('pb-8', i === STAGES.length - 1 && 'pb-0')}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/40')} />
                      <p className={cn('font-medium text-sm', isActive ? 'text-foreground' : 'text-muted-foreground/50')}>
                        {stage.label}
                      </p>
                      {stage.time && isPast && (
                        <span className="text-[10px] text-muted-foreground">{stage.time}</span>
                      )}
                    </div>
                    {isCurrent && !isDone && (
                      <p className="text-xs text-primary mt-0.5 animate-pulse">In progress...</p>
                    )}
                    {/* Special sub-labels */}
                    {stage.key === 'report_ready' && isDone && (
                      <p className="text-xs text-emerald-600 mt-0.5 font-medium">Ready to download</p>
                    )}
                    {stage.key === 'rx_verified' && isPast && (
                      <p className="text-xs text-emerald-600 mt-0.5">Verified by pharmacist ✓</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Type-specific info card */}
        {flowType === FLOW_TYPE.MEDICINE && (
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
                <p className="text-sm text-muted-foreground mt-1">MediCore Logistics · Partner ID: MC-9876</p>
              </div>
            </div>
          </div>
        )}

        {flowType === FLOW_TYPE.TEST && (
          <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6 space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">Collection Address</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchParams.get('collectionMode') === 'home'
                    ? '123, Health Avenue, Block C (Home Collection)'
                    : `${store.name} — Walk-in Collection`}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">Appointment Slot</h4>
                <p className="text-sm text-muted-foreground mt-1">Today · 10:00 AM – 11:00 AM</p>
              </div>
            </div>
          </div>
        )}

        {flowType === FLOW_TYPE.APPOINTMENT && (
          <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6 space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">Doctor</h4>
                <p className="text-sm text-muted-foreground mt-1">Dr. Sarah Mitchell · Cardiologist</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">Appointment Time</h4>
                <p className="text-sm text-muted-foreground mt-1">Today · 02:30 PM – 03:00 PM</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">Clinic</h4>
                <p className="text-sm text-muted-foreground mt-1">{store.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Order Actions */}
        <div className="bg-card rounded-2xl border border-border/60 overflow-hidden mb-6">
          <button
            onClick={() => setShowActions(!showActions)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors"
          >
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

              {flowType === FLOW_TYPE.MEDICINE && (
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={handleReorder}>
                  <RotateCcw className="w-4 h-4 text-primary" /> Reorder
                </Button>
              )}

              {flowType === FLOW_TYPE.TEST && isDone && (
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => setShowReportModal(true)}>
                  <FileText className="w-4 h-4 text-primary" /> View Report
                </Button>
              )}

              {canCancel ? (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 rounded-xl text-red-500 hover:text-red-600 hover:border-red-200"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <XCircle className="w-4 h-4" /> Cancel {flowType === FLOW_TYPE.APPOINTMENT ? 'Appointment' : 'Order'}
                </Button>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {flowType === FLOW_TYPE.APPOINTMENT
                      ? 'Appointment cannot be cancelled less than 2 hours before the scheduled time.'
                      : 'Order cannot be cancelled at this stage — it has already been packed/dispatched.'}
                  </p>
                </div>
              )}

              {isDone && flowType !== FLOW_TYPE.APPOINTMENT && (
                <>
                  <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => setShowReturnModal(true)}>
                    <XCircle className="w-4 h-4 text-primary" /> Return / Replace
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => setShowReviewModal(true)}>
                    <MessageSquare className="w-4 h-4 text-primary" /> Rate & Review
                  </Button>
                </>
              )}

              {isDone && flowType === FLOW_TYPE.APPOINTMENT && (
                <Button variant="outline" className="w-full justify-start gap-3 rounded-xl" onClick={() => setShowReviewModal(true)}>
                  <MessageSquare className="w-4 h-4 text-primary" /> Rate Doctor & Clinic
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── Modals ─────────────────────────────────────────────────────────── */}

        {/* Cancel Confirmation */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCancelConfirm(false)}>
            <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-center text-foreground mb-2">
                Cancel {flowType === FLOW_TYPE.APPOINTMENT ? 'Appointment' : 'Order'}?
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                This action cannot be undone.
                {flowType !== FLOW_TYPE.APPOINTMENT && ' A full refund will be processed within 3-5 business days.'}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCancelConfirm(false)}>Keep</Button>
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
              <h3 className="text-lg font-semibold text-center text-foreground mb-1">
                {flowType === FLOW_TYPE.APPOINTMENT ? 'Rate Your Appointment' : 'Rate Your Order'}
              </h3>
              <p className="text-xs text-muted-foreground text-center mb-5">
                {flowType === FLOW_TYPE.APPOINTMENT ? 'How was your consultation experience?' : 'How was the delivery experience?'}
              </p>
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)}
                    className={cn('w-10 h-10 rounded-full flex items-center justify-center transition-all',
                      s <= reviewRating ? 'text-amber-400' : 'text-muted-foreground/30'
                    )}>
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

        {/* Return Modal (medicine only) */}
        {showReturnModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowReturnModal(false)}>
            <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-center text-foreground mb-4">Return / Replace</h3>
              <p className="text-sm text-muted-foreground mb-4">Why are you returning this order?</p>
              <div className="space-y-2 mb-6">
                {['Damaged item received', 'Wrong item delivered', 'Expired product', 'Item missing from package', 'Other reason'].map(r => (
                  <button key={r} onClick={() => setReturnReason(r)}
                    className={cn('w-full text-left p-3 rounded-xl border text-sm transition-all',
                      returnReason === r ? 'border-primary bg-primary/5 text-foreground' : 'border-border/60 text-muted-foreground'
                    )}>
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

        {/* Report Modal (test flow) */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowReportModal(false)}>
            <div className="bg-card rounded-2xl border border-border/60 p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <FileText className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-center text-foreground mb-2">Lab Report Ready</h3>
              <p className="text-sm text-muted-foreground text-center mb-5">
                Your report has been generated by {store.name}. Download or share it securely.
              </p>
              <div className="space-y-2 mb-4">
                <Button className="w-full rounded-xl gap-2" onClick={() => { toast.success('Report downloaded!'); setShowReportModal(false); }}>
                  <FileText className="w-4 h-4" /> Download PDF
                </Button>
                <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => { toast.success('Shared with doctor!'); setShowReportModal(false); }}>
                  <MessageSquare className="w-4 h-4" /> Share with Doctor
                </Button>
              </div>
              <Button variant="ghost" className="w-full rounded-xl text-muted-foreground" onClick={() => setShowReportModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
