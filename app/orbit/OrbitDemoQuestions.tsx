type DemoQuestion = {
  question: string;
  answer: string;
  panel: string;
};

const demoQuestions: DemoQuestion[] = [
  {
    question: 'Was ist das Produkt in einem Satz?',
    answer: 'KosmoOrbit ist die installierte Steuerzentrale, die Projekt, Rollen, Tools, KI-Hilfe und Review-Gates lokal zusammenfuehrt.',
    panel: 'Presenter-Modus'
  },
  {
    question: 'Was kann man heute schon zeigen?',
    answer: 'Eine statische, lokale Preview mit Projektpaket, Rollenumschaltung, Review-Pfad, Gates und Tagesansicht.',
    panel: 'Projektpaket Tagesansicht'
  },
  {
    question: 'Warum ist das besser als der heutige Workflow?',
    answer: 'Blocker, Reviewlast und naechste Aktion liegen an einem Ort statt verteilt in CAD, Chat, Mail, Ordnern und Kopf-Wissen.',
    panel: 'Tagesansicht + Rollenumschaltung'
  },
  {
    question: 'Warum ist es sicher und nicht KI-Slop?',
    answer: 'Generierung, Publikation und Upload bleiben sichtbar blockiert, bis menschliche Review- und Gate-Entscheide vorliegen.',
    panel: 'Guardrails + Demo-Review-Pfad'
  },
  {
    question: 'Was ist der naechste Entwicklungsschritt?',
    answer: 'Aus der Preview wird ein gefuehrter lokaler Review-Workflow: echte Rollenwahl, echte Projektpakete und spaeter KosmoDesign-Handoff.',
    panel: 'Rollenumschaltung + Review Mode'
  }
];

export function OrbitDemoQuestions() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Demo-Fragen</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Antworten fuer ein Architekturbuero</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Fragen sind fuer die erste Vorfuehrung gedacht. Jede Antwort verweist auf den Bereich der Preview,
            der die Aussage sichtbar belegt.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-white/20 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium leading-tight text-stone-100">
          chef-briefing
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {demoQuestions.map((item) => (
          <article key={item.question} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="max-w-2xl break-words text-base font-semibold text-white">{item.question}</h3>
              <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-200/35 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
                {item.panel}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-300">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
