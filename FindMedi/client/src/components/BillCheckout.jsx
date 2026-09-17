import { motion } from 'framer-motion';
import { IndianRupee, CreditCard, Smartphone, Landmark, Wallet, CheckCircle, Stethoscope, Beaker, Pill } from 'lucide-react';

export default function BillCheckout({
  amount,
  serviceType,
  provider,
  details = {},
  lineItems = [],
  platformFee,
  gst,
  homeCollectionFee,
  deliveryCharges,
  discount = 0,
  discountCode = '',
}) {
  const TypeIcon = serviceType === 'appointment' ? Stethoscope : serviceType === 'test' ? Beaker : Pill;
  const serviceLabel = { appointment: 'Appointment', test: 'Lab Test', medicine: 'Medicine Order' };

  const itemTotal = lineItems.reduce((s, it) => s + (it.price || 0) * (it.qty || 1), 0);
  const calcHomeFee = serviceType === 'test' ? (homeCollectionFee ?? 0) : 0;
  const calcDelivery = serviceType === 'medicine' ? (deliveryCharges ?? 0) : 0;
  const calcPlatform = serviceType === 'appointment' ? (platformFee ?? 0) : 0;
  const calcGst = serviceType === 'appointment' ? (gst ?? 0) : 0;
  const calcDiscount = discount ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* ── Bill Summary Card ── */}
      <div className="bg-gradient-to-br from-primary/[0.03] to-primary/[0.07] rounded-2xl border border-primary/15 p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-4.5 h-4.5 text-primary" />
            <span className="font-bold text-sm text-foreground tracking-tight">BILL SUMMARY</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{serviceLabel[serviceType]}</span>
        </div>

        {/* Type-specific header */}
        {serviceType === 'appointment' && (
          <div className="pb-1">
            <p className="text-sm font-bold text-foreground">
              {details.doctor || 'Doctor'}
              {details.specialization ? ` — ${details.specialization}` : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{provider}</p>
            <p className="text-xs text-muted-foreground">
              {details.date}{details.time ? `, ${details.time}` : ''}
            </p>
            {details.type && <p className="text-xs text-muted-foreground">Appointment Type: {details.type}</p>}
          </div>
        )}

        {serviceType === 'test' && (
          <div className="pb-1">
            <p className="text-sm font-bold text-foreground">{provider}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {details.collectionMode || 'Lab Visit'}
              {details.slot ? ` — ${details.slot}` : ''}
            </p>
          </div>
        )}

        {serviceType === 'medicine' && (
          <div className="pb-1">
            <p className="text-sm font-bold text-foreground">{provider}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {details.deliveryType || 'Home Delivery'}
            </p>
          </div>
        )}

        {/* Line items */}
        <div className="space-y-1.5">
          {lineItems.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="text-foreground font-semibold truncate mr-2">
                {item.name}
                {item.rx ? <span className="text-amber-600 ml-0.5">🔒</span> : ''}
                {item.qty > 1 ? ` × ${item.qty}` : ''}
              </span>
              <span className="font-bold text-foreground shrink-0">
                ₹{((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
          {serviceType === 'test' && calcHomeFee > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground font-semibold">Home Collection Fee</span>
              <span className="font-bold text-foreground">₹{calcHomeFee.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border-t border-primary/10 pt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Item Total</span>
            <span className="font-semibold text-foreground">
              ₹{(itemTotal + calcHomeFee).toLocaleString('en-IN')}
            </span>
          </div>
          {serviceType === 'medicine' && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Delivery Charges</span>
              <span className="font-semibold text-foreground">₹{calcDelivery.toLocaleString('en-IN')}</span>
            </div>
          )}
          {serviceType === 'appointment' && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Platform Fee</span>
              <span className="font-semibold text-foreground">₹{calcPlatform.toLocaleString('en-IN')}</span>
            </div>
          )}
          {serviceType === 'appointment' && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">GST (if applicable)</span>
              <span className="font-semibold text-foreground">₹{calcGst.toLocaleString('en-IN')}</span>
            </div>
          )}
          {calcDiscount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                Discount{discountCode ? ` (${discountCode})` : ''}
              </span>
              <span className="font-semibold text-emerald-600">
                -₹{calcDiscount.toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

        {/* To Pay */}
        <div className="border-t-2 border-primary/20 pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">To Pay</span>
          <span className="text-xl font-bold text-primary">₹{amount?.toLocaleString('en-IN') || 0}</span>
        </div>
      </div>
    </motion.div>
  );
}
