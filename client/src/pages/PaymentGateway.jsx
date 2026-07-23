import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Wallet, Banknote, Building, CheckCircle2, XCircle, Loader2, ArrowLeft, Shield, Lock, Smartphone, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'CRED'];

const PAYMENT_METHODS = {
  upi: { label:'UPI', icon: Smartphone },
  card: { label:'Debit / Credit Card', icon: CreditCard },
  netbanking: { label:'Net Banking', icon: Building },
  wallet: { label:'MediCore Wallet', icon: Wallet },
};

export default function PaymentGateway() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const total = parseInt(searchParams.get('total') || '0');
  const method = searchParams.get('method') || 'upi';
  const orderIds = searchParams.get('orderIds')?.split(',') || [];
  const storeIds = searchParams.get('stores')?.split(',') || [];

  const [step, setStep] = useState('form');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [upiId, setUpiId] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [storeNames, setStoreNames] = useState({});
  const { user } = useAuth();

  useEffect(() => {
    if (storeIds.length === 0) return;
    const load = async () => {
      try {
        const res = await api.getFacilities({ type: 'pharmacy' });
        const list = Array.isArray(res) ? res : res?.facilities || [];
        const map = {};
        list.forEach(f => { map[f._id] = f.name; map[f.id] = f.name; });
        storeIds.forEach(sid => {
          if (sid) {
            const found = list.find(f => f._id === sid || f.id === sid);
            if (found) map[sid] = found.name;
          }
        });
        setStoreNames(map);
      } catch {}
    };
    load();
  }, []);

  const getStoreName = (sid) => storeNames[sid] || sid;

  const methodInfo = PAYMENT_METHODS[method] || PAYMENT_METHODS.upi;
  const MethodIcon = methodInfo.icon;
  const upiQrUpiId = 'medicore@upi';

  const handlePay = async () => {
    setPaying(true);
    setStep('processing');
    try {
      await api.createPayment({
        patientId: user?._id,
        patientName: user?.name,
        email: user?.email,
        orderIds,
        total,
        method,
        status: 'Completed',
      });
      setStep('success');
    } catch (e) {
      setStep('failed');
    }
    setPaying(false);
  };

  const handleProceed = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('total');
    params.delete('method');
    navigate(`/order-confirmation?${params}`);
  };

  const handleRetry = () => setStep('form');

  const formatCardNumber = (v) => v.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background dark:from-primary/10">
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Complete Payment</h1>
          <p className="text-muted-foreground text-sm mt-1">Secure payment powered by MediCore</p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 mb-4">
          <p className="text-xs text-muted-foreground mb-3">Order{storeIds.length > 1 ? 's' : ''}</p>
          {storeIds.map((sid, i) => {
            return (
              <div key={sid} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">{getStoreName(sid)}</span>
                <Badge className="text-[10px] font-mono bg-primary/10 text-primary">{orderIds[i]}</Badge>
              </div>
            );
          })}
          <Separator className="my-3" />
          <div className="flex justify-between text-base font-bold">
            <span>Amount to Pay</span>
            <span className="text-primary">₹{total}</span>
          </div>
        </div>

        {/* Payment Method Display */}
        <div className="bg-card rounded-2xl border border-border/60 p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MethodIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{methodInfo.label}</p>
            </div>
          </div>

          {step === 'form' && (
            <div className="space-y-4">
              {method === 'upi' && (
                <>
                  <div className="bg-muted/30 rounded-xl p-4 text-center border border-border/40">
                    <div className="w-40 h-40 bg-white dark:bg-muted rounded-xl mx-auto mb-3 flex items-center justify-center border border-border/40">
                      <div className="text-center">
                        <Smartphone className="w-16 h-16 text-primary/30 mx-auto" />
                        <p className="text-[10px] text-muted-foreground mt-2 font-mono">{upiQrUpiId}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Scan QR with any UPI app</p>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator /></div>
                    <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted-foreground">OR</span></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="Enter UPI ID (e.g. name@upi)" className="text-sm rounded-lg flex-1" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {UPI_APPS.map(app => (
                      <Badge key={app} className="text-xs px-3 py-1.5 bg-primary/5 text-primary border-primary/20 cursor-pointer hover:bg-primary/10"
                        onClick={() => setUpiId(`${app.toLowerCase().replace(/\s/g,'')}@upi`)}>
                        {app}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-xs text-muted-foreground">UPI ID:</span>
                    <span className="text-xs font-mono text-foreground">{upiQrUpiId}</span>
                    <button onClick={() => { navigator.clipboard.writeText(upiQrUpiId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="ml-auto text-primary hover:text-primary/80">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </>
              )}

              {method === 'card' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between mb-6">
                      <CreditCard className="w-8 h-8 text-primary/60" />
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{cardNumber ? 'Active' : 'Enter card'}</Badge>
                    </div>
                    <p className="text-lg font-mono text-foreground tracking-wider mb-4">{cardNumber || '•••• •••• •••• ••••'}</p>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{cardExpiry || 'MM/YY'}</span>
                      <span>{cardCvv ? '•••' : 'CVV'}</span>
                    </div>
                  </div>
                  <Input value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} placeholder="Card Number" className="text-sm rounded-lg" maxLength={19} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={cardExpiry} onChange={e => setCardExpiry(e.target.value.replace(/\D/g,'').replace(/(\d{2})(\d)/,'$1/$2').slice(0,5))} placeholder="MM/YY" className="text-sm rounded-lg" maxLength={5} />
                    <Input value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g,'').slice(0,3))} placeholder="CVV" className="text-sm rounded-lg" maxLength={3} type="password" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                    <span className="text-xs text-muted-foreground">Save card for next time</span>
                  </label>
                </div>
              )}

              {method === 'netbanking' && (
                <div className="space-y-2">
                  {['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'Yes Bank', 'PNB', 'Canara'].map(b => (
                    <button key={b} onClick={() => setSelectedBank(b)}
                      className={cn('w-full text-left p-3 rounded-xl border text-sm transition-all', selectedBank === b ? 'border-primary bg-primary/5 text-foreground' : 'border-border/60 text-muted-foreground')}>
                      <Building className="w-4 h-4 inline mr-2 text-primary" />{b}
                    </button>
                  ))}
                </div>
              )}

              {method === 'wallet' && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <p className="text-sm text-amber-700 dark:text-amber-300">MediCore Wallet Balance: <strong>₹0</strong></p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Insufficient balance. Please add funds or use another payment method.</p>
                </div>
              )}

              {method !== 'wallet' && (
                <>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-border text-primary focus:ring-primary" />
                    <span className="text-xs text-muted-foreground">I agree to the <button className="text-primary underline">Terms & Conditions</button> and authorize MediCore to charge ₹{total}</span>
                  </label>
                  <Button className="w-full h-14 text-base font-bold gap-3 rounded-2xl shadow-xl shadow-primary/30"
                    onClick={handlePay} disabled={!agreed}>
                    <Lock className="w-5 h-5" /> Pay ₹{total}
                  </Button>
                </>
              )}
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold text-foreground">Processing Payment...</p>
              <p className="text-sm text-muted-foreground mt-1">Please do not close this page</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-foreground">Payment Successful!</p>
              <p className="text-sm text-muted-foreground mt-1">₹{total} has been charged to your {methodInfo.label}</p>
              <Button className="mt-6 gap-2 rounded-xl" onClick={handleProceed}>
                View Order Confirmation
              </Button>
            </div>
          )}

          {step === 'failed' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-foreground">Payment Failed</p>
              <p className="text-sm text-muted-foreground mt-1">Transaction could not be processed. Your cart items are preserved.</p>
              <div className="flex gap-3 mt-6 justify-center">
                <Button className="gap-2 rounded-xl" onClick={handleRetry}>
                  <Loader2 className="w-4 h-4" /> Try Again
                </Button>
                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => navigate('/checkout')}>
                  Try COD Instead
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" /> Secured by 256-bit SSL encryption
        </div>
      </div>
    </div>
  );
}
