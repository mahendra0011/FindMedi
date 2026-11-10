export default function SportsAcademyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Sports Academies &amp; Turfs</h1>
        <p className="text-sm text-muted-foreground">Sports training, swimming, and turf bookings.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Offerings</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Cricket/football turf bookings.</li>
            <li>Swimming and coaching programs.</li>
            <li>Sports injury prevention and rehab linkage.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T3 · No patient clinical data.</p>
    </main>
  );
}
