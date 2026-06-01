const pilotMetrics = [
  {
    metric: 'Suchzeit',
    question: 'Wie lange dauert es, bis Projektstatus, offene Gates und naechste Aktion klar sind?',
    evidence: 'Projektpaket, Tagesansicht, Demo-Fragen, Pruefevidenz'
  },
  {
    metric: 'Blocker-Frueherkennung',
    question: 'Welche Quellen-, Rechte-, Modell- oder Kontextprobleme werden vor Design-/Exportarbeit sichtbar?',
    evidence: 'Risiko-Register, Handoff Console, Command-Vertrag'
  },
  {
    metric: 'Rollenpassung',
    question: 'Versteht jede Rolle schneller, was sie sehen, tun und nicht tun darf?',
    evidence: 'Rollenumschaltung, Rechte-Matrix, Ausbildungsmodus'
  },
  {
    metric: 'Wiederholbarkeit',
    question: 'Kann dieselbe Review-Routine morgen wieder nachvollziehbar ausgefuehrt werden?',
    evidence: 'Buero-Routine, Audit-Trail, Full Review'
  }
];

const pilotRules = [
  'Mit einem kleinen echten Projektpaket starten, nicht mit einer perfekten Produktdemo.',
  'Vorher und nachher messen: Zeit bis Orientierung, erkannte Blocker, offene Fragen und Entscheidungsqualitaet.',
  'Keine automatische Generierung freigeben, solange Kontext, Rechte und Human Review nicht geschlossen sind.',
  'Feedback der Rollen getrennt erfassen: Chef, Projektleitung, Entwurf, Zeichnung und Ausbildung.'
];

export function OrbitPilotMeasurement() {
  return (
    <section className="rounded-lg border border-amber-300/20 bg-amber-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Pilotmessung</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie ein Architekturburo den Nutzen real pruefen kann</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            KosmoOrbit soll nicht mit Fantasie-Prozenten verkauft werden. Der naechste belastbare Schritt ist eine
            kleine Buero-Pilotmessung: gleicher Projektkontext, sichtbare Review-Gates, klare Rollen und messbare
            Beobachtungen.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-amber-100">
          evidence-before-claim
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {pilotMetrics.map((item) => (
          <article key={item.metric} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">{item.metric}</p>
            <p className="mt-3 text-sm leading-5 text-stone-200">{item.question}</p>
            <p className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs leading-5 text-cyan-100">
              Evidenz: {item.evidence}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {pilotRules.map((rule) => (
          <p key={rule} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-300">
            {rule}
          </p>
        ))}
      </div>

      <p className="mt-4 rounded-md border border-rose-300/25 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-100">
        Pilotmessung ist kein Publish-Go: keine Kundendaten, keine externen Accounts, keine Uploads, keine Kostenjobs
        und keine automatische Plan-/Design-Generierung.
      </p>
    </section>
  );
}
