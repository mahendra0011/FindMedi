import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ReferralCodeCard({ code }: { code: string }) {
  const share = async () => {
    const text = `FindMedi join karo! Mera referral code: ${code}`;
    try {
      const nav: any = navigator;
      if (nav.share) {
        await nav.share({ title: 'Refer & Earn', text });
        return;
      }
      await navigator.clipboard?.writeText(text);
      toast.success('Copied! WhatsApp pe share karo.');
    } catch {}
  };
  return (
    <Card className="border-dashed border-2 border-amber-500/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
      <CardContent className="p-5 text-center space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aapka Referral Code</p>
        <motion.p whileTap={{ scale: 0.97 }} className="font-mono text-3xl font-black tracking-[0.2em]">{code || '------'}</motion.p>
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              try {
                navigator.clipboard?.writeText(code);
                toast.success('Copied!');
              } catch {}
            }}
          >
            Copy Code
          </Button>
          <Button size="sm" onClick={share} className="rounded-xl bg-[#25D366] hover:bg-[#1eb85a] text-white font-bold">
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
