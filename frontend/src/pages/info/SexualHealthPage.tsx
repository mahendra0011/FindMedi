export default function SexualHealthPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Sexual-Health Clinics</h1>
        <p className="text-sm text-muted-foreground">Confidential sexual-health services: STI testing, contraception, sexual dysfunction, and counselling.</p>
      </header>
      <section className="space-y-3">
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Discreet by design</h2>
          <p className="mt-2 text-sm text-muted-foreground">Neutral notifications, masked listings, and hidden-from-recents for sensitive appointments. No explicit imagery in listings.</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-semibold">Services</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>STI/STD screening and treatment.</li>
            <li>Contraception and family planning.</li>
            <li>Sexual dysfunction assessment and counselling.</li>
          </ul>
        </article>
      </section>
      <p className="text-xs text-muted-foreground">T1 · Discreet · Claims-restricted.</p>
    </main>
  );
}
