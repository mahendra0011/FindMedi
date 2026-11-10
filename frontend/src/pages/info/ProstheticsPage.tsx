export default function ProstheticsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Prosthetics &amp; Orthotics</h1>
        <p className="text-sm text-muted-foreground">Artificial limbs, braces, splints, and footwear — fitted by certified prosthetist/orthotist.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Services</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Limb prosthesis fitting and training.</li>
            <li>Braces/splints for spine, knee, ankle.</li>
            <li>Diabetic footwear and insoles.</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Care</h2>
          <p className="mt-2 text-sm text-muted-foreground">Follow-up adjustments, repairs, and gait training. RCI-registered P&amp;O professional recommended.</p>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T2 · RCI.</p>
    </main>
  );
}
