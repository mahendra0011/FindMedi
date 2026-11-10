export default function CosmetologyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Cosmetology &amp; Laser Aesthetics</h1>
        <p className="text-sm text-muted-foreground">Skin, hair, and aesthetic treatments — claims restricted.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Services</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Laser hair removal and skin resurfacing.</li>
            <li>Chemical peels and anti-acne protocols.</li>
            <li>Hair transplant (regulated advertising).</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · Claims-restricted · No outcome guarantees.</p>
    </main>
  );
}
