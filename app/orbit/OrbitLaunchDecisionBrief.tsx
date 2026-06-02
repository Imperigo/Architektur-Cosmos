import pushReadinessData from '@/examples/kosmo-orbit/review/orbit-push-readiness.generated.json';

type PushReadinessReport = {
  status: string;
  git: {
    worktree_clean: boolean;
  };
  summary: {
    passed_checks: number;
    check_count: number;
    failed_checks: number;
  };
  decision: {
    local_demo_ready: boolean;
    push_ready_if_owner_go: boolean;
    push_blocked_without_owner_go: boolean;
  };
};

const pushReadiness = pushReadinessData as PushReadinessReport;

const proofRows = [
  {
    label: 'Lokaler Build',
    state: 'ready',
    evidence: 'Next Static Export, Atlas-Smoke, Orbit-Smoke und Brain Doctor sind lokal pruefbar.'
  },
  {
    label: 'Produktgrenze',
    state: 'ready',
    evidence: 'KosmoOrbit wird als installierte Steuerzentrale gezeigt, nicht als fertiges CAD und nicht als Website-Feature.'
  },
  {
    label: 'Owner-Entscheid',
    state: 'required',
    evidence: 'Push, Livegang, externe Accounts, Kostenjobs und Public Claims brauchen eine ausdrueckliche menschliche Freigabe.'
  },
  {
    label: 'Pilot-Evidenz',
    state: 'missing',
    evidence: 'Zeitersparnis, Kostenwirkung und bessere Planungsqualitaet werden erst nach einem echten Buero-Pilot behauptet.'
  }
];

const decisionSteps = [
  'Lokale Demo in /orbit vorfuehren: Presenter, Demo-Bereitschaft, Live-Gate, Projektpaket, Handoff.',
  'Owner entscheidet: weiter lokal halten, pushen und live pruefen, oder zuerst Buero-Pilot mit anonymisiertem Projekt.',
  'Bei Push-Go: main pushen, Cloudflare Deploy abwarten, /orbit und /atlas mit Cache-Buster live smoken.',
  'Bei Pilot-Go: Messkit ausfuellen, keine Kundendaten speichern, keine unbewiesenen Public Claims ableiten.'
];

const stateTone: Record<string, string> = {
  ready: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  required: 'border-amber-300/40 bg-amber-400/10 text-amber-100',
  missing: 'border-rose-300/35 bg-rose-400/10 text-rose-100'
};

function formatState(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitLaunchDecisionBrief() {
  return (
    <section className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Launch Decision Brief</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Push-faehig lokal, aber entscheidungsgebunden</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieses Briefing uebersetzt den technischen Stand in eine menschliche Entscheidung: KosmoOrbit ist lokal
            vorfuehrbar und pruefbar, aber Livegang, Public Claims und Pilot-Auswertung bleiben bewusst Owner- und
            Human-Review-Gates.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-cyan-100">
          push-decision-not-automatic
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-lg border border-emerald-300/25 bg-emerald-400/10 p-3 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Push Readiness Report</p>
          <h3 className="mt-2 text-lg font-semibold text-white">{pushReadiness.summary.passed_checks}/{pushReadiness.summary.check_count} Checks gruen</h3>
          <p className="mt-2 text-sm leading-5 text-stone-300">
            Status: {pushReadiness.status}. Worktree bei Report-Erstellung: {pushReadiness.git.worktree_clean ? 'clean' : 'nicht clean'}.
          </p>
        </div>
        <div className="grid gap-2 text-sm">
          <p className="rounded-md bg-black/24 px-3 py-2 text-stone-200">
            Lokale Demo bereit: {pushReadiness.decision.local_demo_ready ? 'ja' : 'nein'}.
          </p>
          <p className="rounded-md bg-black/24 px-3 py-2 text-stone-200">
            Push-ready nur falls Owner-Go: {pushReadiness.decision.push_ready_if_owner_go ? 'ja' : 'nein'}.
          </p>
          <p className="rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-amber-100">
            Ohne Owner-Go blockiert: {pushReadiness.decision.push_blocked_without_owner_go ? 'ja' : 'nein'}.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {proofRows.map((row) => (
          <article key={row.label} className="rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-white">{row.label}</h3>
              <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${stateTone[row.state] ?? stateTone.required}`}>
                {formatState(row.state)}
              </span>
            </div>
            <p className="mt-3 text-sm leading-5 text-stone-300">{row.evidence}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-amber-300/25 bg-amber-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Empfehlung heute</p>
          <p className="mt-2 text-sm leading-6 text-stone-200">
            Erst Push-Paket und lokale Demo abnehmen, dann entweder live stellen oder den Buero-Pilot starten. Keine
            Design-Generation, keine Runtime-Steuerung und keine Kostenbehauptung vor echter Evidenz.
          </p>
        </div>

        <ol className="grid gap-2 rounded-lg border border-white/10 bg-black/24 p-3">
          {decisionSteps.map((step, index) => (
            <li key={step} className="grid grid-cols-[2rem_1fr] gap-2 text-sm leading-5 text-stone-300">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
