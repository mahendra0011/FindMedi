export default function TransplantPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Transplant Centres</h1>
        <p className="text-sm text-muted-foreground">Organ and tissue transplant services — kidney, liver, heart, bone marrow, cornea — under THOA compliance.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">What we list</h2>
          <p className="mt-2 text-sm text-muted-foreground">Registered transplant centres with NOTTO/ROTTO/SOTTO linkage, surgical teams, and post-transplant follow-up programs.</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Donor pledge</h2>
          <p className="mt-2 text-sm text-muted-foreground">Organ/eye/body donation pledge registration is available. Pledges are non-binding until legal consent at time of donation.</p>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · THOA regulated · Discreet handling.</p>
    </main>
  );
}
