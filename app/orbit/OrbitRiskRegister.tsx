type RiskItem = {
  id: string;
  title: string;
  risk: string;
  mitigation: string;
  owner: string;
  nextGate: string;
};

const riskItems: RiskItem[] = [
  {
    id: 'runtime',
    title: 'Lokale Runtime',
    risk: 'KosmoOrbit darf noch keine Dienste, Modelle, Hardware oder Jobs steuern.',
    mitigation: 'Runtime-Vertrag, Health Readiness und no-runtime-side-effects bleiben sichtbar.',
    owner: 'IT/KI + Chef',
    nextGate: 'Read-only Health Adapter menschlich freigeben.'
  },
  {
    id: 'design-generation',
    title: 'Design-Generation',
    risk: 'Automatische Plaene, Geometrie oder Varianten koennten falsche Architekturentscheidungen erzeugen.',
    mitigation: 'KosmoDesign bleibt im Review Mode, Generation und Public Gate bleiben blockiert.',
    owner: 'Projektleitung + Entwurf',
    nextGate: 'Erste kontrollierte Operation mit Review-Pack definieren.'
  },
  {
    id: 'rights-sources',
    title: 'Quellen und Rechte',
    risk: 'Bilder, Plaene, Modelle oder Texte duerfen nicht ungeprueft public verwendet werden.',
    mitigation: 'KosmoData/KosmoAsset behalten Rechte-, Quellen- und Review-Gates.',
    owner: 'Chef + Projektleitung',
    nextGate: 'Rechteentscheid pro Asset/Projekt dokumentieren.'
  },
  {
    id: 'user-profiles',
    title: 'Rollen und Profile',
    risk: 'Unklare Rechte koennten Lernende, Praktikanten oder Public-Freigaben falsch bedienen.',
    mitigation: 'Rechte-Matrix, Rollenumschaltung und Workstation-Prioritaeten bleiben nur Preview.',
    owner: 'Chef + Ausbildung',
    nextGate: 'Lokales Auth-/Profilkonzept separat freigeben.'
  },
  {
    id: 'office-data',
    title: 'Buero-Daten',
    risk: 'Projektwissen und Buero-Gedaechtnis brauchen Datenschutz, Backup und lokale Kontrolle.',
    mitigation: 'Keine Uploads, keine D1/R2-Writes, keine externen Accounts in der Preview.',
    owner: 'Chef + IT/KI',
    nextGate: 'Lokale Speicher- und Backup-Regeln schreiben.'
  },
  {
    id: 'external-collab',
    title: 'Fachplaner / Extern',
    risk: 'Externe Schnittstellen koennen Haftung, Versionschaos oder Datenabfluss erzeugen.',
    mitigation: 'Externe Zusammenarbeit ist im Installationsbild nur spaeterer Ausbau.',
    owner: 'Projektleitung',
    nextGate: 'Austauschformat und Freigabeprozess getrennt spezifizieren.'
  }
];

export function OrbitRiskRegister() {
  return (
    <section className="rounded-lg border border-rose-300/20 bg-rose-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">Risiko-Register</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Was vor echter Automatisierung entschieden werden muss</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieses Register macht die Produktverantwortung sichtbar: KosmoOrbit kann viel vorbereiten, aber lokale
            Runtime, Design-Generation, Rechte, Profile, Buero-Daten und externe Zusammenarbeit brauchen klare
            menschliche Freigaben.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-rose-100">
          human-approval-risk-register
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {riskItems.map((item) => (
          <article key={item.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="break-words text-base font-semibold text-white">{item.title}</h3>
              <span className="inline-flex max-w-full items-center break-words rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-300">
                {item.owner}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-5">
              <p className="rounded-md border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-rose-100">
                Risiko: {item.risk}
              </p>
              <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
                Schutz: {item.mitigation}
              </p>
              <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                Naechstes Gate: {item.nextGate}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
