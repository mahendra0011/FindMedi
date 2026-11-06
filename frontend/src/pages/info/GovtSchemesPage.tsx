const SECTIONS = [
  {
    title: 'JSY — Janani Suraksha Yojana',
    points: ['Cash assistance for institutional delivery', 'Eligible after 3 antenatal check-ups', 'Applies to BPL and SC/ST families in rural areas; state rules vary'],
  },
  {
    title: 'PMMVY — Pradhan Mantri Matru Vandana Yojana',
    points: ['Cash benefit for first pregnancy (from 2022: second girl child too)', 'Requires Aadhaar + bank account seeding', 'Apply via Anganwadi/ASHA or your health facility'],
  },
  {
    title: 'UIP — Universal Immunisation Programme',
    points: ['Free vaccines for infants and children at PHC/UPHC/Anganwadi', 'BCG, OPV, Pentavalent, Measles, TT/Td', 'Carry the MCP (Mother-Child Protection) card'],
  },
  {
    title: 'National programs (TB / NCD / Mental Health)',
    points: ['TB: Nikshay portal — free diagnosis/treatment', 'NCD: screening at AB-HWC for hypertension, diabetes, oral/breast/cervical cancer', 'Mental health: Tele-MANAS 14416 + district mental health programme (DMHP)'],
  },
  {
    title: 'Free-medicine lists',
    points: ['Jan Aushadhi Kendras: generic medicines at discounted prices', 'Facility free-drug lists vary by state — ask the PHC/CHC pharmacy counter'],
  },
];

export default function GovtSchemesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-foreground">Government Schemes & Programs</h1>
      <p className="text-sm text-muted-foreground">Eligibility overview only. Rules are state-specific — confirm at your PHC/CHC or scheme portal.</p>
      {SECTIONS.map((s) => (
        <section key={s.title} className="rounded-xl border border-border/60 bg-card px-4 py-3">
          <h2 className="font-semibold">{s.title}</h2>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
            {s.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
