export default function FirstResponderPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">First Responders &amp; CPR Volunteers</h1>
        <p className="text-sm text-muted-foreground">Trained community volunteers who can assist during cardiac arrest, accidents, and emergencies until professional help arrives.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">In an emergency</h2>
          <p className="mt-2 text-sm text-muted-foreground">Call 112 / 108 first. Use the SOS button in the app to alert nearby responders and ambulance services.</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Become a volunteer</h2>
          <p className="mt-2 text-sm text-muted-foreground">Complete certified BLS/CPR training, register with your ID, and pass background verification. Volunteers are dispatched only for verified emergencies.</p>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">Volunteer vetting and training workflow subject to verification.</p>
    </main>
  );
}
