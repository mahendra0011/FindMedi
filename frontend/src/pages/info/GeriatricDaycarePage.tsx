export default function GeriatricDaycarePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Geriatric Day-Care Centres</h1>
        <p className="text-sm text-muted-foreground">Day-care for seniors: activities, physiotherapy, meals, and medical supervision.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Services</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Social activities and cognitive stimulation.</li>
            <li>Geriatric physiotherapy and fall prevention.</li>
            <li>Medication management and health monitoring.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T2 · State-regulated.</p>
    </main>
  );
}
