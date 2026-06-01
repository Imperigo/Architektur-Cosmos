type DeltaRow = {
  current: string;
  kosmo: string;
  value: string;
};

const workflowDelta: DeltaRow[] = [
  {
    current: 'Projektwissen liegt in Ordnern, Chats, CAD-Dateien, Mails und Koepfen verteilt.',
    kosmo: 'KosmoOrbit sammelt Projektpaket, Rollen, Gates, Evidenz und naechste Aktion an einem Ort.',
    value: 'weniger Suchzeit'
  },
  {
    current: 'Blocker werden oft erst sichtbar, wenn ein Plan, Modell oder Export bereits zu weit ist.',
    kosmo: 'Review-Gates, Kontextinputs und Rechte werden vor Generierung oder Public-Schritten sichtbar.',
    value: 'fruehere Fehlerbremse'
  },
  {
    current: 'Alle arbeiten mit aehnlich komplexen Tools, obwohl Verantwortung und Erfahrung stark variieren.',
    kosmo: 'Chef, Projektleitung, Entwurf, Zeichnung und Ausbildung sehen unterschiedliche Oberflaechentiefe.',
    value: 'weniger Ueberforderung'
  },
  {
    current: 'Wiederkehrende Pruefungen muessen manuell gestartet, erinnert und dokumentiert werden.',
    kosmo: 'KosmoOrbit bereitet lokale Checks, Tagesroutine, Audit Trail und Review-Berichte als steuerbare Routine vor.',
    value: 'mehr Wiederholbarkeit'
  }
];

const cautionPoints = [
  'Keine Garantie auf konkrete Prozentersparnis ohne echte Buero-Pilotmessung.',
  'Keine automatische Freigabe von Entwurf, Recht, Norm, Kosten oder Publikation.',
  'Kostenreduktion entsteht zuerst durch weniger Sucharbeit, fruehere Blocker und lokale Vorpruefung.'
];

export function OrbitWorkflowDelta() {
  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Workflow-Delta</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Was KosmoOrbit gegenueber dem heutigen Bueroablauf verbessert</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Der Nutzen liegt nicht darin, CAD blind zu ersetzen. Der erste Produktwert liegt darin, verstreutes Wissen,
            Rollen, Blocker und Review-Schritte so zu ordnen, dass Menschen schneller bessere Entscheidungen treffen.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
          no-roi-claim
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {workflowDelta.map((row) => (
          <article key={row.value} className="grid gap-3 rounded-lg border border-white/10 bg-black/24 p-3 lg:grid-cols-[1fr_1fr_0.55fr]">
            <div className="min-w-0 rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Heute oft</p>
              <p className="mt-2 text-sm leading-5 text-stone-200">{row.current}</p>
            </div>
            <div className="min-w-0 rounded-md border border-emerald-300/20 bg-emerald-400/10 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Mit KosmoOrbit</p>
              <p className="mt-2 text-sm leading-5 text-stone-200">{row.kosmo}</p>
            </div>
            <div className="min-w-0 rounded-md border border-cyan-300/20 bg-cyan-400/10 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">Wirkung</p>
              <p className="mt-2 text-sm font-semibold leading-5 text-white">{row.value}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {cautionPoints.map((point) => (
          <p key={point} className="rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-sm leading-5 text-amber-100">
            {point}
          </p>
        ))}
      </div>
    </section>
  );
}
