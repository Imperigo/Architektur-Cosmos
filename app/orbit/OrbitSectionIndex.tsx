const sectionLinks = [
  { href: '#autonomie', label: 'Autonomie' },
  { href: '#routine', label: 'Routine' },
  { href: '#presenter', label: '3-Minuten' },
  { href: '#workflow-delta', label: 'Workflow' },
  { href: '#pilotmessung', label: 'Pilot' },
  { href: '#pilotplan', label: 'Pilotplan' },
  { href: '#fortschritt', label: 'Fortschritt' },
  { href: '#vision', label: 'Vision' },
  { href: '#demo-ready', label: 'Demo' },
  { href: '#projektpaket', label: 'Projektpaket' },
  { href: '#design-handoff', label: 'Handoff' },
  { href: '#entscheidung', label: 'Decision' },
  { href: '#runtime-contract', label: 'Runtime' },
  { href: '#installation', label: 'Installation' },
  { href: '#health', label: 'Health' },
  { href: '#risiken', label: 'Risiken' },
  { href: '#commands', label: 'Commands' },
  { href: '#audit', label: 'Audit' },
  { href: '#evidenz', label: 'Evidenz' },
  { href: '#ausbildung', label: 'Ausbildung' },
  { href: '#rechte', label: 'Rechte' },
  { href: '#rollen', label: 'Rollen' },
  { href: '#guardrails', label: 'Guardrails' }
];

export function OrbitSectionIndex() {
  return (
    <nav className="rounded-lg border border-white/10 bg-black/24 p-3" aria-label="KosmoOrbit Abschnitte">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Demo-Navigation</span>
        {sectionLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-stone-200 transition hover:border-cyan-200/40 hover:bg-cyan-300/10 hover:text-cyan-100"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
