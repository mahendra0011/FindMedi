export default function FallDetectionPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Fall-Detection &amp; Emergency Devices</h1>
        <p className="text-sm text-muted-foreground">Wearables and home devices that detect falls and alert caregivers or emergency services.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">Devices use accelerometers/gyroscopes to detect sudden falls and trigger alerts to family or monitoring centres. Some auto-call emergency services.</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Buying tips</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Check CDSCO approval and battery life.</li>
            <li>Prefer devices with automatic fall detection (not just manual SOS).</li>
            <li>Ensure 24x7 monitoring or reliable caregiver alerts.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">Product · T2 · Device class per MDR 2017.</p>
    </main>
  );
}
