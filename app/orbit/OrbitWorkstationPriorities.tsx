type WorkstationPriority = {
  role: string;
  firstPanel: string;
  secondPanel: string;
  blockedUntil: string;
};

const workstationPriorities: WorkstationPriority[] = [
  {
    role: 'Chef / Admin',
    firstPanel: 'MVP-Grenze',
    secondPanel: 'Pruefevidenz',
    blockedUntil: 'Public-Gates und Runtime-Fragen geklaert sind.'
  },
  {
    role: 'Projektleitung',
    firstPanel: 'Projektpaket Tagesansicht',
    secondPanel: 'Review Decision Draft',
    blockedUntil: 'Kontextinputs und Review-Artefakte entschieden sind.'
  },
  {
    role: 'Entwurf',
    firstPanel: 'Gefuehrter Demo-Review-Pfad',
    secondPanel: 'KosmoDesign Review Mode',
    blockedUntil: 'Design-Generation menschlich freigegeben ist.'
  },
  {
    role: 'Zeichnung',
    firstPanel: 'Modellprofil',
    secondPanel: 'Naechste Review-Artefakte',
    blockedUntil: 'Modellqualitaet, Layer und Exporte geprueft sind.'
  },
  {
    role: 'Ausbildung',
    firstPanel: 'Presenter-Modus',
    secondPanel: 'Demo-Fragen',
    blockedUntil: 'Lernmodus und sichere Uebungen getrennt sind.'
  }
];

export function OrbitWorkstationPriorities() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Arbeitsstationen</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Welche Rolle sieht zuerst welches Panel?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Prioritaeten zeigen die spaetere Arbeitsplatzlogik: dieselbe Hauptsoftware, aber eine andere erste
            Sicht je Verantwortung, Erfahrungsstand und Risiko.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-sky-300/35 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-sky-100">
          role-first-ui
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {workstationPriorities.map((item) => (
          <article key={item.role} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <h3 className="break-words text-base font-semibold text-white">{item.role}</h3>
            <div className="mt-3 grid gap-2">
              <div className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">zuerst</p>
                <p className="mt-1 break-words text-sm text-stone-100">{item.firstPanel}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                <p className="text-xs uppercase tracking-[0.14em] text-stone-500">danach</p>
                <p className="mt-1 break-words text-sm text-stone-300">{item.secondPanel}</p>
              </div>
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.14em] text-amber-100">blockiert bis</p>
                <p className="mt-1 text-sm leading-5 text-stone-300">{item.blockedUntil}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
