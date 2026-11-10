export default function ENTPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">ENT &amp; Audiology Centres</h1>
        <p className="text-sm text-muted-foreground">Ear, nose, throat, hearing tests, and hearing-aid fitting.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Services</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Audiometry and tympanometry.</li>
            <li>Hearing-aid fitting and cochlear implant support.</li>
            <li>Sinus, tonsil, and voice procedures.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · RCI for audiology.</p>
    </main>
  );
}
