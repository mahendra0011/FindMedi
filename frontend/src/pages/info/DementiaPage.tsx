export default function DementiaPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Dementia &amp; Alzheimer's Care</h1>
        <p className="text-sm text-muted-foreground">Information and care options for people living with dementia and their caregivers.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Early signs</h2>
          <p className="mt-2 text-sm text-muted-foreground">Memory loss affecting daily life, confusion with time/place, difficulty with familiar tasks, mood changes. Consult a neurologist/geriatrician for assessment.</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Support</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Memory clinics and geriatric assessment.</li>
            <li>Caregiver training and respite care.</li>
            <li>Home safety modifications and routine structuring.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · Caregiver support resources available.</p>
    </main>
  );
}
