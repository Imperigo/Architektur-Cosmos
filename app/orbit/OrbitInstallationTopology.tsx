type TopologyNode = {
  id: string;
  label: string;
  role: string;
  today: string;
  later: string;
  gate: string;
};

const topologyNodes: TopologyNode[] = [
  {
    id: 'kosmo-zentrale',
    label: 'KosmoZentrale',
    role: 'lokale Appliance',
    today: 'Als Produktidee, Runtime-Vertrag und Health-Sprache sichtbar.',
    later: 'Starker Buero-Rechner fuer lokale KI, Modelle, Jobs, Daten und Reparatur.',
    gate: 'keine Hardware-Steuerung'
  },
  {
    id: 'workstations',
    label: 'Arbeitsstationen',
    role: 'KosmoOrbit Clients',
    today: 'Rollenlogik zeigt unterschiedliche Oberflaechen fuer Menschen im Buero.',
    later: 'Installierte KosmoOrbit-Clients mit Profilen, Rechten und Tool-Zugriff.',
    gate: 'keine echte Auth-Runtime'
  },
  {
    id: 'local-knowledge',
    label: 'Lokales Wissen',
    role: 'KosmoData / KosmoAsset',
    today: 'Statische Projekt-, Review- und Asset-Artefakte werden gelesen.',
    later: 'Buero-Gedaechtnis, Projektwissen, Quellen, Rechte und Asset-Bibliothek.',
    gate: 'keine D1/R2-/Upload-Writes'
  },
  {
    id: 'design-tools',
    label: 'Architektur-Tools',
    role: 'KosmoDesign und Untertools',
    today: 'KosmoDesign bleibt Review Mode; Generatoren und Exporte bleiben blockiert.',
    later: 'Prepare, Design, Draw, Viz, Publish und Blender-Pipelines orchestrieren.',
    gate: 'keine Prozessstarts'
  },
  {
    id: 'human-review',
    label: 'Menschliche Freigabe',
    role: 'Qualitaet und Verantwortung',
    today: 'Review Decision Draft, Pruefevidenz und Rechte-Matrix sind sichtbar.',
    later: 'Architekt:innen bestaetigen Qualitaet, Rechte, Normen und Public Gates.',
    gate: 'keine automatische Freigabe'
  },
  {
    id: 'external-collab',
    label: 'Externe Zusammenarbeit',
    role: 'spaeterer Ausbau',
    today: 'Nur als gesperrte Grenze benannt, nicht technisch aktiv.',
    later: 'Fachplaner, Austauschformate, Publishing und externe Freigaben anbinden.',
    gate: 'keine Netzwerksteuerung'
  }
];

export function OrbitInstallationTopology() {
  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Buero-Installation</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie Architektur Kosmos als lokales System ins Buero kommt</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieses Installationsbild macht den Produktkern greifbar: Beim Kauf kommt nicht nur eine Website,
            sondern eine lokale KosmoZentrale mit KosmoOrbit auf den Arbeitsstationen. Heute ist das eine
            statische Landkarte, spaeter die operative Steuerungsschicht.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-emerald-100">
          local-appliance-map
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {topologyNodes.map((node) => (
          <article key={node.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-white">{node.label}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">{node.role}</p>
              </div>
              <span className="inline-flex max-w-full items-center break-words rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-300">
                {node.id}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-5">
              <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
                Heute: {node.today}
              </p>
              <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
                Spaeter: {node.later}
              </p>
              <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                Gate: {node.gate}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
