import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, XCircle, Clock, ArrowRight, RotateCcw, StopCircle, RefreshCw, Store, Pill, ExternalLink, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { usePreferredPharmacies } from '@/context/PreferredPharmacyContext';
import { useAutoRetry, AUTO_RETRY_STATUS, REJECTION_REASONS } from '@/hooks/useAutoRetry';

export default function AutoRetryPanel({ orderContext, onPriceConfirm, onStoreSelect }) {
  const { pharmacies, autoRetryEnabled } = usePreferredPharmacies();
  const autoRetry = useAutoRetry();
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [priceDiff, setPriceDiff] = useState(0);
  const [pendingRejectParams, setPendingRejectParams] = useState(null);
  const [slaCountdown, setSlaCountdown] = useState(10); // 10s demo SLA

  // Countdown timer — ticks while a store is being tried
  useEffect(() => {
    if (autoRetry.status !== AUTO_RETRY_STATUS.TRYING) {
      setSlaCountdown(10);
      return;
    }
    setSlaCountdown(10);
    const interval = setInterval(() => {
      setSlaCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRetry.status, autoRetry.currentStore?.id]);

  const handleSimulateReject = () => {
    if (!autoRetryEnabled || pharmacies.length === 0) return;
    const firstStore = pharmacies[0];
    const firstIndex = 0;
    const startResult = autoRetry.startRetry(
      { id: 'blurry', label: 'Unclear/blurry prescription image' },
      orderContext
    );
    if (startResult) {
      setTimeout(() => {
        const diff = Math.floor(Math.random() * 30) + 5;
        if (diff <= 5) {
          autoRetry.handleReject(firstIndex, firstStore, { id: 'blurry', label: 'Unclear/blurry prescription image' }, orderContext);
        } else {
          setPriceDiff(diff);
          setPendingRejectParams({
            storeIndex: firstIndex,
            store: firstStore,
            reason: { id: 'blurry', label: 'Unclear/blurry prescription image' },
          });
          setShowPriceConfirm(true);
        }
      }, 3000);
    }
  };

  const statusIcon = {
    [AUTO_RETRY_STATUS.IDLE]: null,
    [AUTO_RETRY_STATUS.TRYING]: RefreshCw,
    [AUTO_RETRY_STATUS.ACCEPTED]: CheckCircle2,
    [AUTO_RETRY_STATUS.ALL_EXHAUSTED]: XCircle,
    [AUTO_RETRY_STATUS.STOPPED]: StopCircle,
  };

  const statusColors = {
    [AUTO_RETRY_STATUS.IDLE]: '',
    [AUTO_RETRY_STATUS.TRYING]: 'text-blue-500',
    [AUTO_RETRY_STATUS.ACCEPTED]: 'text-emerald-500',
    [AUTO_RETRY_STATUS.ALL_EXHAUSTED]: 'text-red-500',
    [AUTO_RETRY_STATUS.STOPPED]: 'text-amber-500',
  };

  const statusBgColors = {
    [AUTO_RETRY_STATUS.IDLE]: '',
    [AUTO_RETRY_STATUS.TRYING]: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
    [AUTO_RETRY_STATUS.ACCEPTED]: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    [AUTO_RETRY_STATUS.ALL_EXHAUSTED]: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
    [AUTO_RETRY_STATUS.STOPPED]: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
  };

  if (!autoRetryEnabled) return null;

  const StatusIcon = statusIcon[autoRetry.status] || null;

  return (
    <div className={cn(
      'rounded-2xl border p-5 space-y-4 transition-all',
      statusBgColors[autoRetry.status] || 'bg-card border-border/60'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {StatusIcon && <StatusIcon className={cn('w-5 h-5', statusColors[autoRetry.status])} />}
          <h3 className="font-heading font-semibold text-foreground text-[15px]">
            {autoRetry.status === AUTO_RETRY_STATUS.IDLE && 'Preferred Pharmacy Auto-Retry'}
            {autoRetry.status === AUTO_RETRY_STATUS.TRYING && 'Auto-Retry in Progress'}
            {autoRetry.status === AUTO_RETRY_STATUS.ACCEPTED && 'Prescription Accepted'}
            {autoRetry.status === AUTO_RETRY_STATUS.ALL_EXHAUSTED && 'All Pharmacies Declined'}
            {autoRetry.status === AUTO_RETRY_STATUS.STOPPED && 'Auto-Retry Stopped'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* SLA countdown shown while trying */}
          {autoRetry.status === AUTO_RETRY_STATUS.TRYING && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-lg border',
              slaCountdown <= 3
                ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20'
                : 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20'
            )}>
              <Timer className="w-3 h-3" />
              <span>Auto-escalate in {slaCountdown}s</span>
            </div>
          )}
          {autoRetry.status === AUTO_RETRY_STATUS.TRYING && (
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-red-500 hover:text-red-600 rounded-lg"
              onClick={autoRetry.stopRetry}>
              <StopCircle className="w-3.5 h-3.5" /> Stop Auto-Retry
            </Button>
          )}
        </div>
      </div>

      {/* Last rejection reason */}
      {autoRetry.lastRejection && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-red-700 dark:text-red-400">Rejection Reason</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">{autoRetry.lastRejection.label}</p>
          </div>
        </div>
      )}

      {/* Tried stores timeline */}
      {autoRetry.triedStores.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Tried Stores</p>
          {autoRetry.triedStores.map((ts, i) => (
            <div key={i} className={cn(
              'flex items-center gap-3 p-3 rounded-xl border text-sm transition-all',
              ts.result === 'accepted' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-500/5' :
              ts.result === 'pending' ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-500/5' :
              'border-red-200/50 bg-red-50/30 dark:bg-red-500/5'
            )}>
              <Badge className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                i === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                {ts.store.priority}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{ts.store.name}</p>
                {ts.reason && <p className="text-xs text-muted-foreground mt-0.5">Rejected: {ts.reason.label}</p>}
              </div>
              {ts.result === 'accepted' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
              {ts.result === 'rejected' && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
              {ts.result === 'pending' && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
            </div>
          ))}

          {/* Currently trying */}
          {autoRetry.status === AUTO_RETRY_STATUS.TRYING && autoRetry.currentStore && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-sm">
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
              <span className="text-muted-foreground">
                Trying: <strong className="text-foreground">{autoRetry.currentStore.name}</strong> (Priority {autoRetry.currentStore.priority})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Price Diff Confirmation */}
      {showPriceConfirm && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Price Difference</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                The next preferred pharmacy has different pricing for some items. Review before proceeding.
              </p>
            </div>
          </div>
          <div className="text-sm">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Original Total</span>
              <span className="font-medium">₹{orderContext?.originalTotal || 0}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">New Total ({autoRetry.currentStore?.name})</span>
              <span className="font-medium">₹{(orderContext?.originalTotal || 0) + priceDiff}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span className={priceDiff > 0 ? 'text-red-500' : 'text-emerald-500'}>
                Difference: {priceDiff > 0 ? `+₹${priceDiff}` : `-₹${Math.abs(priceDiff)}`}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 rounded-lg gap-1.5" onClick={() => {
              setShowPriceConfirm(false);
              if (pendingRejectParams) {
                onPriceConfirm?.(true);
                autoRetry.handleReject(
                  pendingRejectParams.storeIndex,
                  pendingRejectParams.store,
                  pendingRejectParams.reason,
                  orderContext
                );
                setPendingRejectParams(null);
              }
            }}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Continue
            </Button>
            <Button size="sm" variant="outline" className="flex-1 rounded-lg gap-1.5"
              onClick={() => { setShowPriceConfirm(false); onStoreSelect?.(); }}>
              <Store className="w-3.5 h-3.5" /> Choose Different Store
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-red-500"
              onClick={() => { setShowPriceConfirm(false); autoRetry.stopRetry(); }}>
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* All exhausted — fallback */}
      {autoRetry.status === AUTO_RETRY_STATUS.ALL_EXHAUSTED && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 space-y-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            None of your preferred pharmacies could accept the prescription. Please take one of the following actions:
          </p>
          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 rounded-lg text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Re-upload a clearer prescription
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 rounded-lg text-xs">
              <Pill className="w-3.5 h-3.5" /> Get a new prescription from your doctor
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 rounded-lg text-xs">
              <ExternalLink className="w-3.5 h-3.5" /> Contact Support / Live Chat
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2 rounded-lg text-xs text-red-500">
              <XCircle className="w-3.5 h-3.5" /> Cancel Order (Full Refund)
            </Button>
          </div>
        </div>
      )}

      {/* Simulate rejection (for demo) */}
      {autoRetry.status === AUTO_RETRY_STATUS.IDLE && autoRetryEnabled && pharmacies.length > 0 && (
        <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs" onClick={handleSimulateReject}>
          <RefreshCw className="w-3.5 h-3.5" /> Simulate Rx Rejection (Demo)
        </Button>
      )}

      {/* Retry after stopped */}
      {autoRetry.status === AUTO_RETRY_STATUS.STOPPED && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs" onClick={autoRetry.resetRetry}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset & Try Again
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-xs"
            onClick={() => onStoreSelect?.()}>
            <Store className="w-3.5 h-3.5" /> Manually Select Store
          </Button>
        </div>
      )}
    </div>
  );
}
