const HELPLINES = [
  { number: '112', label: 'National emergency (all services)' },
  { number: '108', label: 'Ambulance (BSNL/IVR + GPS dispatch)' },
  { number: '102', label: 'Patient transport (non-emergency)' },
  { number: '14416', label: 'Tele-MANAS mental-health helpline (24×7)' },
  { number: '181', label: 'Women helpline' },
  { number: '1098', label: 'Child helpline' },
  { number: '1800-111-066', label: 'Poison information centre (24×7, toll-free)' },
];

export default function HelplineDirectory() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <h1 className="font-heading text-2xl font-bold text-foreground">Helpline Directory</h1>
      <p className="text-sm text-muted-foreground">Official public numbers. Free, no booking needed. Info only — no appointment inside FindMedi.</p>
      <ul className="space-y-2">
        {HELPLINES.map((h) => (
          <li key={h.number} className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3">
            <span className="text-sm">{h.label}</span>
            <a href={`tel:${h.number.replace(/[^0-9]/g, '')}`} className="font-semibold text-primary">{h.number}</a>
          </li>
        ))}
        <li className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
          Anti-venom & snake-bite: go to the nearest government/district hospital emergency — anti-venom is stocked at PHC/CHC.
        </li>
      </ul>
    </div>
  );
}
