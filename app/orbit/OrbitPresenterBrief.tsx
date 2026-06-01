type PresenterPoint = {
  label: string;
  title: string;
  text: string;
};

const presenterPoints: PresenterPoint[] = [
  {
    label: '00:00',
    title: 'Was ist KosmoOrbit?',
    text: 'Die installierte Hauptsoftware-Zentrale: Sie sammelt Projektstatus, Rollen, Tools, Gates und sichere naechste Schritte.'
  },
  {
    label: '01:00',
    title: 'Warum ist das nuetzlich?',
    text: 'Ein Buero sieht sofort, was lokal bereit ist, was menschlich geprueft werden muss und was bewusst blockiert bleibt.'
  },
  {
    label: '02:00',
    title: 'Warum noch keine Generierung?',
    text: 'KosmoDesign bleibt im Review Mode, bis Kontext, Quellen, Modellqualitaet und Freigabe-Gates sauber entschieden sind.'
  }
];

export function OrbitPresenterBrief() {
  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.05] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Presenter-Modus</p>
          <h2 className="mt-2 text-xl font-semibold text-white">3-Minuten-Erklaerung fuer Architekten</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieser Block ist die ruhige Erzaehlspur fuer eine Demo. Er beschreibt nicht die Technik, sondern warum
            KosmoOrbit im Buero einen besseren, guenstigeren und sichereren Arbeitsablauf vorbereiten kann.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-100">
          live-demo-ready
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {presenterPoints.map((point) => (
          <article key={point.label} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="font-mono text-xs text-emerald-100">{point.label}</p>
            <h3 className="mt-2 text-base font-semibold text-white">{point.title}</h3>
            <p className="mt-2 text-sm leading-5 text-stone-300">{point.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Besser</p>
          <p className="mt-2 text-sm leading-5 text-stone-300">Rollen sehen nur, was sie fuer Verantwortung und Erfahrung brauchen.</p>
        </div>
        <div className="min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Schneller</p>
          <p className="mt-2 text-sm leading-5 text-stone-300">Projektblocker, Reviewlast und naechste Aktion liegen an einem Ort.</p>
        </div>
        <div className="min-w-0 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Guenstiger</p>
          <p className="mt-2 text-sm leading-5 text-stone-300">Kosmo kann lokal pruefen und vorbereiten, bevor teure Fehler, Cloudjobs oder Abgaben entstehen.</p>
        </div>
      </div>
    </section>
  );
}
