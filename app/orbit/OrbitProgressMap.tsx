type ProgressLane = {
  title: string;
  status: string;
  percent: number;
  tone: string;
  scope: string;
  evidence: string;
  next: string;
};

const progressLanes: ProgressLane[] = [
  {
    title: 'KosmoOrbit Preview',
    status: 'sichtbar',
    percent: 72,
    tone: 'from-emerald-300 to-cyan-300',
    scope: 'Rollen, Projektpaket, Guardrails, Pruefevidenz und Demo-Pfad sind in /orbit sichtbar.',
    evidence: 'Route-Smoke, Full Review und Static Export laufen lokal gruen.',
    next: 'Vor dem Push einmal im Browser als 3-Minuten-Demo durchgehen.'
  },
  {
    title: 'Rollen und Arbeitsstationen',
    status: 'erste Produktlogik',
    percent: 58,
    tone: 'from-cyan-300 to-sky-300',
    scope: 'Chef/Admin, Projektleitung, Entwurf, Zeichnung und Ausbildung erhalten unterschiedliche Oberflaechen.',
    evidence: 'Role Switcher, Workstation Priorities und Safety Policy zeigen die Unterschiede ohne echte Userdaten.',
    next: 'Als Naechstes echte Rollenrechte als lokales Vertragsmodell spezifizieren.'
  },
  {
    title: 'KosmoDesign Handoff',
    status: 'review-only',
    percent: 38,
    tone: 'from-violet-300 to-fuchsia-300',
    scope: 'KosmoDesign ist als wichtigster Unterpfad sichtbar, aber noch nicht als Generator freigegeben.',
    evidence: 'Projektpaket, Design-Handoff, Decision Draft und blocked actions erklaeren die Sperre.',
    next: 'Freigabekriterien fuer erste kontrollierte Design-Operationen definieren.'
  },
  {
    title: 'KosmoZentrale Runtime',
    status: 'spaeter',
    percent: 14,
    tone: 'from-amber-300 to-orange-300',
    scope: 'Lokale KI, starke Hardware, Updates, Reparatur und Jobsteuerung bleiben noch Produktvertrag.',
    evidence: 'Runtime Boundary zeigt bewusst no-runtime-side-effects.',
    next: 'Lokalen Runtime-Vertrag mit Hardware, Netzwerk, Logs und Reparaturmodus entwerfen.'
  },
  {
    title: 'CAD-/Plan-Generation',
    status: 'gesperrt',
    percent: 6,
    tone: 'from-rose-300 to-red-300',
    scope: 'Automatische Plaene, Geometrie, BIM-Entscheide und Publikation sind noch nicht aktiv.',
    evidence: 'Keine API, keine Server Actions, kein Public-Publish, keine Design-Generation.',
    next: 'Erst nach menschlichem Review, Modellqualitaet und Rechtekette freischalten.'
  }
];

export function OrbitProgressMap() {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Projektfortschritt</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Von Vision zu sichtbarem KosmoOrbit-MVP</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Karte ist keine Gesamtprojekt-Prozentzahl. Sie zeigt, welche Produktspuren heute schon vorfuehrbar
            sind, welche erst als Vertrag existieren und welche wegen Qualitaet, Haftung und Kosten bewusst gesperrt
            bleiben.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
          vision-to-mvp-map
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {progressLanes.map((lane) => (
          <article key={lane.title} className="min-w-0 rounded-lg border border-white/10 bg-black/26 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white">{lane.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">{lane.status}</p>
              </div>
              <span className="font-mono text-sm text-stone-200">{lane.percent}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full bg-gradient-to-r ${lane.tone}`} style={{ width: `${lane.percent}%` }} />
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              <p className="rounded-md bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-300">{lane.scope}</p>
              <p className="rounded-md bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-400">{lane.evidence}</p>
              <p className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm leading-5 text-cyan-100">{lane.next}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
