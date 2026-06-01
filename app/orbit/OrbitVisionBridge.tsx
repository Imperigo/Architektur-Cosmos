const visionTracks = [
  {
    id: 'kosmo-zentrale',
    label: 'KosmoZentrale',
    scope: 'lokale KI, Jobs, Memory, Reparatur und Hardwarezustand',
    status: 'geplant',
    gate: 'keine Runtime in dieser Preview'
  },
  {
    id: 'kosmo-prepare',
    label: 'KosmoPrepare',
    scope: 'Wettbewerb, Standort, Gesetze, ISOS, Grundlagenmodell',
    status: 'Review-Vertrag',
    gate: 'Kontextinputs menschlich pruefen'
  },
  {
    id: 'kosmo-design',
    label: 'KosmoDesign',
    scope: 'Entwurfspfad mit Kontext, Modellprofil und Variantenlogik',
    status: 'sichtbar',
    gate: 'context_review_only'
  },
  {
    id: 'kosmo-draw-viz-publish',
    label: 'KosmoDraw / Viz / Publish',
    scope: 'Plan, Bild, Layout, Abgabe und Exportpakete',
    status: 'gesperrt',
    gate: 'keine Generatoraktion ohne Freigabe'
  },
  {
    id: 'kosmo-data-asset',
    label: 'KosmoData / KosmoAsset',
    scope: 'Referenzen, Projekte, Assets, Texturen und Rechte',
    status: 'statisch gespiegelt',
    gate: 'keine D1/R2-/Upload-Writes'
  }
];

export function OrbitVisionBridge() {
  return (
    <section className="rounded-lg border border-violet-300/20 bg-violet-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">Vision Bridge</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie KosmoOrbit die grosse Kosmos-Pipeline ordnet</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            KosmoOrbit ist nicht der Generator selbst. Es ist die sichere Schaltzentrale, die KosmoData,
            KosmoAsset, KosmoPrepare, KosmoDesign, KosmoDraw, KosmoViz und KosmoPublish in Rollen,
            Freigaben und Review-Zustaende uebersetzt.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-violet-300/35 bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-violet-100">
          Orchestrierung vor Generierung
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {visionTracks.map((track) => (
          <article key={track.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-white">{track.label}</h3>
              <span className="inline-flex max-w-full items-center rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-300">
                {track.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-5 text-stone-300">{track.scope}</p>
            <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
              {track.gate}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
