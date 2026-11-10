export default function LactationPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Lactation Consultants &amp; Doulas</h1>
        <p className="text-sm text-muted-foreground">Breastfeeding support, prenatal classes, and birth companionship.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Services</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Lactation consulting (positioning, supply, latch).</li>
            <li>Prenatal classes and birth preparation.</li>
            <li>Doula support during labour and postpartum.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T2 · ART Act compliant where applicable.</p>
    </main>
  );
}
