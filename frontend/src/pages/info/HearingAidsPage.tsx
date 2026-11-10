export default function HearingAidsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Hearing Aids</h1>
        <p className="text-sm text-muted-foreground">Digital hearing aids fitted by audiologists. Includes fitting, programming, and follow-up.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Process</h2>
          <p className="mt-2 text-sm text-muted-foreground">Hearing test → device selection → fitting/programming → trial → follow-up adjustments. RCI-registered audiologist recommended.</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Care &amp; warranty</h2>
          <p className="mt-2 text-sm text-muted-foreground">Regular cleaning, battery/charging care, and periodic reprogramming. Check warranty and service network before purchase.</p>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">Product · T2 · MDR 2017, RCI.</p>
    </main>
  );
}
