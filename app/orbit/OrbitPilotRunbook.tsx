const pilotSteps = [
  {
    time: '00-05',
    owner: 'Projektleitung',
    title: 'Ausgangslage messen',
    intent: 'Vor KosmoOrbit kurz festhalten, wo Projektstatus, offene Fragen, Blocker und naechste Aktion heute gesucht werden.',
    output: 'baseline-note'
  },
  {
    time: '05-15',
    owner: 'Chef / Admin',
    title: 'Zentrale lesen',
    intent: 'Presenter-Modus, Workflow-Delta und Demo-Bereitschaft zeigen, damit Nutzen und Grenze in einfacher Sprache klar sind.',
    output: 'owner-orientation'
  },
  {
    time: '15-30',
    owner: 'Projektleitung / Entwurf',
    title: 'Projektpaket pruefen',
    intent: 'Projektpaket Tagesansicht, KosmoDesign Handoff und Review Decision Draft gemeinsam durchgehen.',
    output: 'review-question-list'
  },
  {
    time: '30-45',
    owner: 'Zeichnung / Ausbildung',
    title: 'Rollenrunde testen',
    intent: 'Rollenumschaltung, Rechte-Matrix und Ausbildungsmodus pruefen: sieht jede Rolle nur das, was sie verstehen und verantworten kann?',
    output: 'role-feedback'
  },
  {
    time: '45-60',
    owner: 'Owner',
    title: 'Pilotentscheidung',
    intent: 'Entscheiden, ob der naechste Sprint UI-Interaktion, KosmoDesign-Handoff oder Daten-/Rechteklaerung vertiefen soll.',
    output: 'pilot-decision'
  }
];

const pilotEvidence = [
  'Zeit bis Orientierung',
  'erkannte Blocker',
  'offene Rueckfragen',
  'Verstaendlichkeit pro Rolle',
  'fehlende Daten fuer echten Betrieb'
];

const pilotHardStops = [
  'keine Kundendaten',
  'keine Uploads',
  'keine Kosten',
  'keine Design-Generation',
  'kein Push ohne Owner-Go'
];

function formatOutput(value: string) {
  return value.replace(/-/g, ' ');
}

export function OrbitPilotRunbook() {
  return (
    <section className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">Pilot-Runbook</p>
          <h2 className="mt-2 text-xl font-semibold text-white">45-60 Minuten Buero-Test ohne Live-Risiko</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieses Runbook uebersetzt die KosmoOrbit-Preview in einen realen Testablauf fuer ein Architekturburo:
            zuerst Ausgangslage messen, dann Zentrale lesen, Projektpaket pruefen, Rollen testen und bewusst
            entscheiden, welcher Produktschritt als naechstes Sinn macht.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-fuchsia-300/35 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-fuchsia-100">
          local-review-only
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {pilotSteps.map((step) => (
          <article key={step.time} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-1 font-mono text-[11px] text-cyan-100">
                {step.time}
              </span>
              <span className="inline-flex max-w-full items-center break-words rounded-full border border-white/15 bg-white/[0.05] px-2 py-1 text-[10px] text-stone-200">
                {step.owner}
              </span>
            </div>
            <h3 className="mt-3 break-words text-base font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-5 text-stone-300">{step.intent}</p>
            <p className="mt-3 rounded-md border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-xs leading-5 text-fuchsia-100">
              Output: {formatOutput(step.output)}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Messpunkte</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pilotEvidence.map((item) => (
              <span key={item} className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-rose-300/25 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Hard Stops</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pilotHardStops.map((item) => (
              <span key={item} className="inline-flex max-w-full items-center break-words rounded-full border border-rose-300/30 bg-black/20 px-2.5 py-1 text-xs text-rose-100">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
