type RuntimeStage = {
  id: string;
  label: string;
  today: string;
  later: string;
  gate: string;
};

const runtimeStages: RuntimeStage[] = [
  {
    id: 'zentrale-health',
    label: 'KosmoZentrale Health',
    today: 'Statussprache, Pruefevidenz und Demo-Readiness sichtbar.',
    later: 'Lokale Hardware, GPU, Speicher, Modelle und Services diagnostizieren.',
    gate: 'nur lesen, keine Service-Steuerung'
  },
  {
    id: 'local-ai',
    label: 'Lokale KI Kosmo',
    today: 'Kosmo wird als steuernde Rolle und Produktversprechen sichtbar.',
    later: 'Lokales Modell starten, stoppen, beobachten, reparieren und mit Memory verbinden.',
    gate: 'kein Modellstart, kein Memory-Write'
  },
  {
    id: 'tool-launch',
    label: 'Tool Launch',
    today: 'KosmoPrepare, Design, Draw, Viz, Publish, Data und Asset sind als Pfade geordnet.',
    later: 'Blender, Add-ons, Renderer, Exporter und lokale Hilfsdienste kontrolliert starten.',
    gate: 'keine Prozessstarts'
  },
  {
    id: 'job-orchestration',
    label: 'Job Orchestration',
    today: 'Review-Gates und blockierte Aktionen zeigen, welche Jobs noch nicht laufen duerfen.',
    later: 'Queue fuer Analyse, Render, Plan, Export, Reparatur und QA-Jobs fuehren.',
    gate: 'keine Queue, keine Kostenjobs'
  },
  {
    id: 'repair-update',
    label: 'Repair / Update',
    today: 'Autonomie-Status beschreibt nur lokale Repo-Arbeit und QA-Skripte.',
    later: 'Software, Add-ons, Connectoren und lokale Daten automatisch pruefen und reparieren.',
    gate: 'keine Systemaenderung'
  }
];

export function OrbitRuntimeContract() {
  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Runtime-Vertrag</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie KosmoOrbit spaeter die lokale Zentrale steuert</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieses Panel ist der Vertrag vor der echten Runtime: KosmoOrbit darf heute nur lesen, erklaeren
            und blockieren. Spaeter darf die installierte Software lokale KI, Blender-Tools, Jobs, Reparatur
            und Updates steuern, aber erst nach klaren Freigaben.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
          no-process-launch
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {runtimeStages.map((stage) => (
          <article key={stage.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-white">{stage.label}</h3>
              <span className="inline-flex max-w-full items-center break-words rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-300">
                {stage.id}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-5">
              <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
                Heute: {stage.today}
              </p>
              <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
                Spaeter: {stage.later}
              </p>
              <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                Gate: {stage.gate}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
