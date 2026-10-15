/**
 * 15.md §3 install prompt entry point (hero-adjacent, explicit user action).
 * Renders nothing unless the browser fired beforeinstallprompt — no nagging
 * on iOS or already-installed contexts.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function InstallAppButton() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [busy, setBusy] = useState(false);

  if (!canInstall) return null;

  const onClick = async () => {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="lg"
      variant="outline"
      disabled={busy}
      className="gap-2 text-base px-8 h-14"
      onClick={onClick}
    >
      <Download className="w-4 h-4" /> Install App
    </Button>
  );
}
