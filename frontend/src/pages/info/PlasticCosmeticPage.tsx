export default function PlasticCosmeticPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Plastic &amp; Cosmetic Surgery</h1>
        <p className="text-sm text-muted-foreground">Reconstructive and aesthetic surgery by qualified plastic surgeons.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Scope</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Burns and trauma reconstruction.</li>
            <li>Cleft lip/palate repair.</li>
            <li>Hand and microsurgery.</li>
            <li>Aesthetic procedures (claims restricted — no outcome guarantees).</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · Claims-restricted · No guaranteed outcomes.</p>
    </main>
  );
}
