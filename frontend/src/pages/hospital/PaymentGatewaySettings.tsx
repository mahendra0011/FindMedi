import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CreditCard, CheckCircle2, AlertTriangle, Settings, ExternalLink } from 'lucide-react';

const GATEWAYS = [
  { id: 'razorpay', name: 'Razorpay', description: 'UPI, Cards, NetBanking, Wallets', envVar: 'RAZORPAY_KEY_ID', docs: 'https://razorpay.com/docs/payments' },
  { id: 'cashfree', name: 'Cashfree', description: 'UPI, Cards, NetBanking, Wallets', envVar: 'CASHFREE_APP_ID', docs: 'https://www.cashfree.com/docs' },
  { id: 'payu', name: 'PayU', description: 'UPI, Cards, NetBanking', envVar: 'PAYU_MERCHANT_KEY', docs: 'https://payu.in/developers' },
  { id: 'phonepe', name: 'PhonePe', description: 'UPI, Cards', envVar: 'PHONEPE_MERCHANT_ID', docs: 'https://developer.phonepe.com' },
];

export default function PaymentGatewaySettings() {
  const [gateways, setGateways] = useState(GATEWAYS.map((g) => ({ ...g, configured: false, mode: 'sandbox' })));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    try {
      // Check which gateways are configured via existing integrations endpoint
      const res = await api.get('/integrations');
      const integrations = res.data?.integrations || [];
      setGateways((prev) => prev.map((g) => {
        const found = integrations.find((i: any) => i.provider === g.id || i.name?.toLowerCase().includes(g.id));
        return { ...g, configured: !!found, mode: found?.mode || 'sandbox' };
      }));
    } catch {
      // Gateway config check is non-critical
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-blue-600" />
          Payment Gateway Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure payment providers for hospital billing</p>
      </div>

      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium">Sandbox Mode Active</p>
              <p className="text-sm text-muted-foreground">
                Gateways are in test mode. Add real API keys via environment variables to enable live payments.
                Keys are configured server-side and never exposed to the browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gateways.map((gw) => (
          <Card key={gw.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{gw.name}</CardTitle>
                <Badge variant={gw.configured ? 'default' : 'secondary'}>
                  {gw.configured ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Configured</>
                  ) : (
                    'Not Configured'
                  )}
                </Badge>
              </div>
              <CardDescription>{gw.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>✓ UPI payments</p>
                <p>✓ Card payments</p>
                <p>✓ Refund support</p>
                <p>✓ Webhook handling</p>
              </div>
              <div className="p-2 bg-muted rounded text-xs font-mono">
                Env: {gw.envVar}=your_key
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={gw.docs} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" /> Docs
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Guide</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>1. Create account with payment provider (Razorpay/Cashfree/PayU/PhonePe)</p>
          <p>2. Get API keys from provider dashboard</p>
          <p>3. Add keys to backend <code>.env</code> file</p>
          <p>4. Restart backend server</p>
          <p>5. Configure webhook URL in provider dashboard: <code>{typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/webhooks/&lt;gateway&gt;</code></p>
        </CardContent>
      </Card>
    </div>
  );
}
