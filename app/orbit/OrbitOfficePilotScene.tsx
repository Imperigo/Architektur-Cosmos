const sceneSteps = [
  {
    label: 'Start',
    actor: 'Projektleitung',
    title: 'Projektpaket oeffnen',
    outcome: 'KosmoOrbit zeigt Kontext, offene Blocker, Rollenprofil und erlaubte Review-Artefakte.',
    guard: 'keine Kundendaten hochladen, keine Cloud, keine Geometrie- oder Plan-Writes'
  },
  {
    label: 'Review',
    actor: 'Entwurf',
    title: 'KosmoDesign lesen',
    outcome: 'KosmoDesign wird als Review Mode genutzt: Referenzen, Modellprofil, Constraints und fehlende Evidenz.',
    guard: 'keine Design-Generation, keine automatischen Varianten, kein CAD-Ersatz-Claim'
  },
  {
    label: 'Rollen',
    actor: 'Chef / Admin',
    title: 'Rechte und Tiefe vergleichen',
    outcome: 'Chef, Projektleitung, Zeichnung und Ausbildung sehen unterschiedliche Tiefe und blockierte Aktionen.',
    guard: 'keine echte Auth-Runtime, keine User-Writes, keine Rechteveraenderung'
  },
  {
    label: 'Entscheid',
    actor: 'Menschliches Review',
    title: 'Pilotwert festhalten',
    outcome: 'Nur beobachtete Zeit, Qualitaet, Blocker und Nutzen werden notiert; leere Felder bleiben leer.',
    guard: 'keine unbewiesenen Zeit-/Kostenclaims, kein Push ohne Owner-Go'
  }
];

const officeRoles = [
  {
    role: 'Chef / Admin',
    sees: 'Entscheid, Risiken, Owner-Go, Public Gate',
    needs: 'kurze Ampel, harte Stopps, Pilotnutzen'
  },
  {
    role: 'Projektleitung',
    sees: 'Projektpaket, Blocker, Review-Artefakte',
    needs: 'naechster Pruefschritt, offene Evidenz, Zuständigkeit'
  },
  {
    role: 'Entwurf',
    sees: 'KosmoDesign Review Mode, Kontext, Referenzen',
    needs: 'Entwurfslogik verstehen, aber Generierung bewusst gesperrt'
  },
  {
    role: 'Ausbildung',
    sees: 'vereinfachte Begriffe, Lernmodus, sichere Beispiele',
    needs: 'erklaerte Entscheidungen, keine riskanten Aktionen'
  }
];

const pilotEvidence = [
  'Wieviel Zeit brauchte der heutige Ablauf ohne KosmoOrbit?',
  'Welche Blocker erkannte KosmoOrbit schneller oder klarer?',
  'Welche Entscheidung traf ein Mensch danach bewusster?',
  'Was blieb unsicher und darf noch nicht als Nutzen behauptet werden?'
];

export function OrbitOfficePilotScene() {
  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Buero-Pilot Szene</p>
          <h2 className="mt-2 text-xl font-semibold text-white">So wirkt KosmoOrbit im kleinen Architekturbuero</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Szene verbindet die Vision mit einem ersten sicheren Alltagstest: KosmoOrbit startet nicht als fertiges
            CAD, sondern als lokale Steuerzentrale, die Projektwissen, Rollen, Review-Gates und KosmoDesign sichtbar
            zusammenbringt.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-emerald-100">
          local-office-pilot-review-only
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {sceneSteps.map((step, index) => (
          <article key={step.label} className="rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-400/10 text-xs font-semibold text-emerald-100">
                {index + 1}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-300">
                {step.actor}
              </span>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">{step.label}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-5 text-stone-300">{step.outcome}</p>
            <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-400/10 px-2.5 py-2 text-xs leading-5 text-amber-100">
              {step.guard}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Rollenbild</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {officeRoles.map((role) => (
              <article key={role.role} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
                <h3 className="text-sm font-semibold text-white">{role.role}</h3>
                <p className="mt-2 text-xs leading-5 text-stone-300">{role.sees}</p>
                <p className="mt-2 text-xs leading-5 text-cyan-100">{role.needs}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.055] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Evidenz vor Claim</p>
          <ul className="mt-3 grid gap-2">
            {pilotEvidence.map((item) => (
              <li key={item} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-stone-300">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-100">
            Der Pilot behauptet keinen ROI, keine automatische Planung und keine offizielle Zertifizierung. Er sammelt
            zuerst menschlich gepruefte Beobachtungen.
          </p>
        </div>
      </div>
    </section>
  );
}
