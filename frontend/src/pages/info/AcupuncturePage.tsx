export default function AcupuncturePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Acupuncture, Acupressure &amp; Cupping</h1>
        <p className="text-sm text-muted-foreground">Traditional therapy listings. Practitioners are AYUSH-registered; verify credentials before booking.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">What to expect</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sessions use fine needles, pressure, or cupping to support pain relief, stress, and chronic conditions. Evidence varies by condition; discuss with your doctor.</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Safety notes</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Ensure single-use sterile needles and a registered practitioner.</li>
            <li>Not recommended for bleeding disorders, certain skin infections, or during pregnancy (specific points).</li>
            <li>Claims of curing diseases are not permitted; consult your physician.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">AYUSH-regulated · Claims restricted.</p>
    </main>
  );
}
