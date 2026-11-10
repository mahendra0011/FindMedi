const ITEMS = [
  { q: 'Does sugar cause diabetes?', a: 'No. Diabetes is caused by insulin resistance or insufficient insulin production. Eating too much sugar can lead to weight gain, which increases risk, but sugar itself does not directly cause diabetes.' },
  { q: 'Can antibiotics treat viral infections (cold/flu)?', a: 'No. Antibiotics kill bacteria, not viruses. Taking antibiotics for viral infections contributes to antibiotic resistance.' },
  { q: 'Is vaccines cause autism?', a: 'No. Large studies have found no link between vaccines and autism. Vaccines are safe and prevent serious diseases.' },
  { q: 'Does cracking knuckles cause arthritis?', a: 'No. Knuckle cracking does not cause arthritis, though it may slightly reduce grip strength over time.' },
  { q: 'Is it true you must drink 8 glasses of water a day?', a: 'Not necessarily. Water needs vary by activity, climate, and diet. Fruits and vegetables also contribute to hydration.' },
  { q: 'Can you catch a cold from cold weather?', a: 'No. Colds are caused by viruses. Cold weather may make people stay indoors closer together, increasing transmission.' },
];

export default function MythBustingPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Health Myth-Busting &amp; Fact-Check</h1>
        <p className="text-sm text-muted-foreground">Doctor-reviewed answers to common health myths. Content is informational only — not medical advice.</p>
      </header>
      <section className="space-y-3">
        {ITEMS.map((it) => (
          <article key={it.q} className="rounded-2xl border border-border/60 bg-card p-5">
            <h2 className="font-semibold text-foreground">{it.q}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{it.a}</p>
          </article>
        ))}
      </section>
      <p className="text-xs text-muted-foreground">Doctor-reviewed ✓ · Last reviewed 2026. For personal concerns, consult a clinician.</p>
    </main>
  );
}
