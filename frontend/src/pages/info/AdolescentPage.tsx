export default function AdolescentPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Adolescent &amp; School Health Programs</h1>
        <p className="text-sm text-muted-foreground">Teen health, school health check-ups, and adolescent counselling.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Scope</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Growth and puberty counselling.</li>
            <li>School health screenings (vision, dental, BMI).</li>
            <li>Mental-health support for teens.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · School/college health programs.</p>
    </main>
  );
}
