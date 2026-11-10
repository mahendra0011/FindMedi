export default function HomeDoctorVisitPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Home Doctor Visits</h1>
        <p className="text-sm text-muted-foreground">Book a doctor visit at home for OPD consultations, follow-ups, and minor procedures.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">Select specialty → choose a doctor offering home visits → pick a slot → confirm. Doctors carry basic equipment; complex cases are referred to facility.</p>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · Mode: home_visit.</p>
    </main>
  );
}
