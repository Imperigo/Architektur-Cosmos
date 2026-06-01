const preparationItems = [
  'Demo- oder anonymisiertes Projektpaket waehlen',
  'Keine Kundendaten, vertraulichen Plaene oder externen Accounts verwenden',
  'Presenter, Workflow, Pilotmessung, Messkit, Runbook und Handoff oeffnen',
  'Klar sagen: kein Upload, keine Kosten, keine Generation, kein Livegang'
];

const pilotSteps = [
  {
    label: 'Baseline',
    text: 'Normalen Weg fuer Status, Blocker und naechste Aktion kurz festhalten.'
  },
  {
    label: 'KosmoOrbit lesen',
    text: 'Pruefen, ob Rollen, Rechte, Review-Gates und sichere Schritte verstaendlich sind.'
  },
  {
    label: 'Messkit ausfuellen',
    text: 'Nur echte menschliche Beobachtungen eintragen; leere Werte bleiben leer.'
  },
  {
    label: 'Handoff pruefen',
    text: 'Klaeren, ob der blockierte KosmoDesign Review Mode fachlich nachvollziehbar ist.'
  },
  {
    label: 'Rollenrunde',
    text: 'Chef, Projektleitung, Entwurf, Zeichnung und Ausbildung getrennt anschauen.'
  }
];

const stopItems = [
  'keine Kundendaten speichern',
  'keine Uploads',
  'keine Kostenjobs',
  'keine externen Accounts',
  'keine automatische Plan- oder Design-Generierung',
  'kein Push oder Deploy ohne Owner-Go',
  'keine unbewiesenen Zeit- oder Kostenclaims'
];

export function OrbitPilotFacilitatorChecklist() {
  return (
    <section className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">Facilitator Checkliste</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Bueropilot fuehren, ohne Produktivbetrieb zu behaupten</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Checkliste macht den ersten 45-60-Minuten-Test moderierbar:
            vorbereiten, Baseline aufnehmen, KosmoOrbit lesen, Messkit fuellen
            und am Ende bewusst entscheiden.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-fuchsia-300/35 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-fuchsia-100">
          local review only
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.25fr_0.85fr]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Vor dem Termin</p>
          <ul className="mt-3 grid gap-2 text-sm leading-5 text-stone-300">
            {preparationItems.map((item) => (
              <li key={item} className="rounded-md bg-white/[0.04] px-3 py-2">{item}</li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Pilot-Ablauf</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pilotSteps.map((step) => (
              <article key={step.label} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                <h3 className="text-sm font-semibold text-white">{step.label}</h3>
                <p className="mt-1 text-xs leading-5 text-stone-400">{step.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-rose-300/20 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Harte Stopps</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {stopItems.map((item) => (
              <span key={item} className="inline-flex max-w-full items-center break-words rounded-full border border-rose-300/25 bg-black/24 px-2.5 py-1 text-xs leading-tight text-rose-100">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
