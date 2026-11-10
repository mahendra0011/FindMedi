export default function PainClinicPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Pain, Wound-Care &amp; Diabetic-Foot Clinics</h1>
        <p className="text-sm text-muted-foreground">Chronic pain management, wound care, and diabetic foot clinics.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Services</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Chronic pain assessment and nerve blocks.</li>
            <li>Wound dressing, debridement, and negative-pressure therapy.</li>
            <li>Diabetic foot screening and limb salvage.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · CEA regulated.</p>
    </main>
  );
}
