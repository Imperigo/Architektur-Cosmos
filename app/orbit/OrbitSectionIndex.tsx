const sectionGroups = [
  {
    label: 'Schnellpfad',
    links: [
      { href: '#presenter', label: '3-Minuten' },
      { href: '#demo-ready', label: 'Demo' },
      { href: '#projektpaket', label: 'Projektpaket' },
      { href: '#live-gate', label: 'Live-Gate' },
      { href: '#launch-brief', label: 'Launch' },
      { href: '#office-pilot', label: 'Buero-Pilot' }
    ]
  },
  {
    label: 'Pilot',
    links: [
      { href: '#pilotmessung', label: 'Messung' },
      { href: '#pilot-kit', label: 'Messkit' },
      { href: '#pilot-checklist', label: 'Checkliste' },
      { href: '#pilot-result', label: 'Resultat' },
      { href: '#pilotplan', label: 'Pilotplan' },
      { href: '#pilot-session', label: 'Session' }
    ]
  },
  {
    label: 'System',
    links: [
      { href: '#autonomie', label: 'Autonomie' },
      { href: '#routine', label: 'Routine' },
      { href: '#tool-registry', label: 'Tools' },
      { href: '#workflow-delta', label: 'Workflow' },
      { href: '#fortschritt', label: 'Fortschritt' },
      { href: '#vision', label: 'Vision' }
    ]
  },
  {
    label: 'Review',
    links: [
      { href: '#design-handoff', label: 'Handoff' },
      { href: '#design-pilot', label: 'Pilotpfad' },
      { href: '#entscheidung', label: 'Decision' },
      { href: '#evidenz', label: 'Evidenz' },
      { href: '#guardrails', label: 'Guardrails' }
    ]
  },
  {
    label: 'Betrieb',
    links: [
      { href: '#runtime-contract', label: 'Runtime' },
      { href: '#runtime-adapter', label: 'Adapter' },
      { href: '#installation', label: 'Installation' },
      { href: '#health', label: 'Health' },
      { href: '#commands', label: 'Commands' },
      { href: '#audit', label: 'Audit' }
    ]
  },
  {
    label: 'Rollen',
    links: [
      { href: '#workstation-profile', label: 'Profile' },
      { href: '#ausbildung', label: 'Ausbildung' },
      { href: '#rechte', label: 'Rechte' },
      { href: '#rollen', label: 'Rollen' },
      { href: '#risiken', label: 'Risiken' }
    ]
  }
];

export function OrbitSectionIndex() {
  return (
    <nav className="rounded-lg border border-white/10 bg-black/24 p-3" aria-label="KosmoOrbit Abschnitte">
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="min-w-[12rem] max-w-[15rem] shrink-0 rounded-md border border-cyan-200/20 bg-cyan-300/[0.06] px-3 py-2 lg:min-w-[13rem]">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Demo-Navigation</span>
          <p className="mt-1 text-xs leading-5 text-stone-400">Schnellpfad zuerst, danach Pilot, Betrieb und Rollen.</p>
        </div>
        {sectionGroups.map((group) => (
          <div key={group.label} className="min-w-[12rem] shrink-0 rounded-md border border-white/10 bg-white/[0.025] p-2 lg:min-w-[13rem]">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">{group.label}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {group.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-9 max-w-full items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium leading-tight text-stone-200 transition hover:border-cyan-200/40 hover:bg-cyan-300/10 hover:text-cyan-100 focus-visible:border-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
                >
                  <span className="truncate">{link.label}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
