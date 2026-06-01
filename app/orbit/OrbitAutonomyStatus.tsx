type AutonomyItem = {
  label: string;
  value: string;
  tone: string;
};

const autonomyItems: AutonomyItem[] = [
  {
    label: 'Arbeitsmodus',
    value: 'autonomer Website-Batch',
    tone: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
  },
  {
    label: 'Sicherheitslinie',
    value: 'keine Cloud-Kosten, keine Writes',
    tone: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
  },
  {
    label: 'Aktueller Fokus',
    value: 'KosmoOrbit vorfuehrbar machen',
    tone: 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  }
];

const autonomySteps = [
  'Plan und Prioritaeten sind im Repo dokumentiert.',
  'Gebaute Panels werden mit Route-Smoke, UI-Audit und Build abgesichert.',
  'Commits bleiben lokal, bis ein Push oder Publish bewusst ausgeloest wird.',
  'Naechster Schritt bleibt klein: pruefen, ordnen, dann erst erweitern.'
];

export function OrbitAutonomyStatus() {
  return (
    <section className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Autonomie-Status</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Was KosmoWebsite gerade selbststaendig tut</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieser Block macht den Arbeitsmodus sichtbar: KosmoWebsite darf lokal planen, pruefen, dokumentieren
            und kleine Website-Schritte bauen. Riskante Infrastruktur bleibt gesperrt.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
          local-autonomy
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {autonomyItems.map((item) => (
          <article key={item.label} className={`min-w-0 rounded-lg border p-3 ${item.tone}`}>
            <p className="text-xs uppercase tracking-[0.14em] opacity-80">{item.label}</p>
            <p className="mt-2 break-words text-base font-semibold text-white">{item.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {autonomySteps.map((step) => (
          <p key={step} className="rounded-md border border-white/10 bg-black/24 px-3 py-2 text-sm leading-5 text-stone-300">
            {step}
          </p>
        ))}
      </div>
    </section>
  );
}

