export default function BabyFoodPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Baby Food &amp; Infant Formula</h1>
        <p className="text-sm text-muted-foreground">Infant nutrition products — FSSAI + IMS Act compliant.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Guidance</h2>
          <p className="mt-2 text-sm text-muted-foreground">Exclusive breastfeeding for first 6 months. Formula only when medically indicated. Follow paediatrician advice; check expiry and storage.</p>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T3 · FSSAI + IMS Act · No medical claims.</p>
    </main>
  );
}
