const handoffStages = [
  {
    title: 'Projektkontext einfrieren',
    owner: 'Projektleitung',
    output: 'anonymisiertes Projektpaket, offene Blocker, erlaubte Quellen',
    guard: 'keine Kundendaten in Pilotnotizen, keine Uploads, keine externen Accounts'
  },
  {
    title: 'KosmoDesign Review Mode',
    owner: 'Entwurf',
    output: 'Kontext, Modellprofil, Referenzen und Constraints werden fachlich gelesen',
    guard: 'keine Design-Generation, keine Geometrie-Writes, keine Public Claims'
  },
  {
    title: 'Rollenrunde',
    owner: 'Chef / Admin',
    output: 'welche Rolle sieht welche Tiefe, welche Aktion bleibt blockiert',
    guard: 'keine echten Userrechte, keine Auth-Runtime, keine Arbeitsstations-Writes'
  },
  {
    title: 'Pilotentscheidung',
    owner: 'Menschliches Review',
    output: 'weiter lokal testen, Push freigeben oder naechste Evidenz sammeln',
    guard: 'keine Kosten-/Zeitersparnis behaupten, bevor Messwerte dokumentiert sind'
  }
];

const pilotChoices = [
  {
    label: 'Sofort vorfuehren',
    when: 'wenn Chefs nur die Vision und den sicheren Stand verstehen sollen',
    next: 'Presenter, Launch Brief, Projektpaket und Handoff Console zeigen'
  },
  {
    label: 'Bueropilot starten',
    when: 'wenn das Tool an einem kleinen realen Ablauf gemessen werden soll',
    next: 'Messkit ausfuellen, Rollenrunde durchgehen, Result Draft leer halten'
  },
  {
    label: 'KosmoDesign V2 bauen',
    when: 'wenn nach der Demo mehr Produktlogik statt Livegang gewuenscht ist',
    next: 'Input-Checkliste, Blocker-Entscheid und Review Mode tiefer ausarbeiten'
  }
];

export function OrbitDesignPilotPath() {
  return (
    <section className="rounded-lg border border-violet-300/20 bg-violet-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">KosmoDesign Pilotpfad</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Vom Review Mode zum messbaren Buero-Pilot</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            KosmoOrbit ueberspringt das manuelle CAD nicht durch blinde Generierung. Der sichere erste Schritt ist ein
            lokaler Review-Pilot: Kontext verstehen, Rollen pruefen, Blocker sichtbar machen und erst danach
            entscheiden, ob KosmoDesign mehr darf.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-violet-300/40 bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-violet-100">
          review-pilot-before-generation
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {handoffStages.map((stage, index) => (
          <article key={stage.title} className="rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-violet-300/35 bg-violet-400/10 text-xs font-semibold text-violet-100">
                {index + 1}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-300">
                {stage.owner}
              </span>
            </div>
            <h3 className="mt-3 text-base font-semibold text-white">{stage.title}</h3>
            <p className="mt-2 text-sm leading-5 text-stone-300">{stage.output}</p>
            <p className="mt-3 rounded-md border border-rose-300/20 bg-rose-400/10 px-2.5 py-2 text-xs leading-5 text-rose-100">
              {stage.guard}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {pilotChoices.map((choice) => (
          <article key={choice.label} className="rounded-lg border border-cyan-200/15 bg-cyan-300/[0.055] p-3">
            <h3 className="text-base font-semibold text-white">{choice.label}</h3>
            <p className="mt-2 text-sm leading-5 text-stone-300">{choice.when}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">{choice.next}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
