type BoundaryColumn = {
  title: string;
  tone: string;
  items: string[];
};

const boundaryColumns: BoundaryColumn[] = [
  {
    title: 'Heute sichtbar',
    tone: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
    items: [
      'Statische /orbit Preview',
      'Projektpaket Tagesansicht',
      'Rollenumschaltung als Browser-Preview',
      'Gefuehrter Demo-Review-Pfad',
      'Nicht-schreibender Decision Draft'
    ]
  },
  {
    title: 'MVP-Vertrag',
    tone: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100',
    items: [
      'Lokale Projektpakete lesen',
      'Rollen- und Gate-Sprache stabilisieren',
      'KosmoDesign nur im Review Mode oeffnen',
      'Review-Entscheide mit Evidenz vorbereiten',
      'Keine Public-Freigabe ohne Menschen'
    ]
  },
  {
    title: 'Spaetere Runtime',
    tone: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
    items: [
      'KosmoZentrale Hardware und lokale KI',
      'Echte Benutzerprofile und Auth',
      'Tool-Start, Updates und Reparatur',
      'Persistente Decision Records',
      'Fachplaner- und Publishing-Schnittstellen'
    ]
  }
];

export function OrbitRuntimeBoundary() {
  return (
    <section className="rounded-lg border border-white/10 bg-black/28 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">MVP-Grenze</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Heute sichtbar, morgen Vertrag, spaeter Runtime</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Abgrenzung verhindert Ueberversprechen: KosmoOrbit zeigt heute die Produktlogik,
            bereitet den MVP-Vertrag vor und laesst echte Runtime-Aufgaben bei KosmoZentrale.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-amber-100">
          no-runtime-side-effects
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {boundaryColumns.map((column) => (
          <article key={column.title} className={`min-w-0 rounded-lg border p-3 ${column.tone}`}>
            <h3 className="text-base font-semibold text-white">{column.title}</h3>
            <ul className="mt-3 grid gap-2">
              {column.items.map((item) => (
                <li key={item} className="rounded-md bg-black/20 px-3 py-2 text-sm leading-5">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
