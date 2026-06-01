import type { DesignHandoffPreview, ProjectInspectorReport } from './OrbitProjectDashboard';

type OrbitReviewDecisionDraftProps = {
  projectInspector: ProjectInspectorReport;
  designHandoff: DesignHandoffPreview;
};

const decisionOptions = [
  {
    id: 'needs_more_evidence',
    label: 'Needs more evidence',
    active: true,
    reason: 'Kontextinputs sind blockiert/undecided und Design-Artefakte brauchen menschliche Review.'
  },
  {
    id: 'approve_local_review',
    label: 'Approve local review',
    active: false,
    reason: 'Erst moeglich, wenn Quellen, Kontext und Modellqualitaet menschlich geprueft sind.'
  },
  {
    id: 'reject_or_block',
    label: 'Reject / block',
    active: false,
    reason: 'Nur noetig, wenn Evidenz oder Rechte klar gegen weitere Nutzung sprechen.'
  }
];

export function OrbitReviewDecisionDraft({ projectInspector, designHandoff }: OrbitReviewDecisionDraftProps) {
  const evidenceRefs = [
    `project: ${projectInspector.project.id}`,
    `handoff: ${designHandoff.handoff.mode}`,
    `context blocked inputs: ${designHandoff.context.blocked_input_count}`,
    `review artifacts: ${projectInspector.summary.review_artifact_count}`,
    `gates disabled: ${projectInspector.summary.disabled_gate_count}`
  ];
  const firstGate = projectInspector.review_gates[0];
  const firstBlocker = designHandoff.blockers[0];

  return (
    <section className="rounded-lg border border-sky-300/20 bg-sky-300/[0.05] p-4">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.25fr] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">Review Decision Draft</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Lokaler Entscheidungsentwurf ohne Schreibaktion</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Dieses Panel zeigt, wie eine Projektleitung spaeter eine Review-Entscheidung vorbereiten kann.
            In dieser Preview wird nichts gespeichert, keine Freigabe gesetzt und keine Generierung gestartet.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Empfehlung</p>
          <p className="mt-2 text-2xl font-semibold text-white">needs_more_evidence</p>
          <p className="mt-2 text-sm leading-5 text-sky-100">{designHandoff.context.recommended_next_step.replace(/_/g, ' ')}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-2">
          {decisionOptions.map((option) => (
            <div
              key={option.id}
              className={`min-w-0 rounded-lg border px-3 py-2 ${
                option.active
                  ? 'border-sky-300/45 bg-sky-400/10 text-sky-100'
                  : 'border-white/10 bg-white/[0.04] text-stone-300'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{option.label}</p>
                <span className="font-mono text-xs">{option.id}</span>
              </div>
              <p className="mt-2 text-sm leading-5">{option.reason}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          <div className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Evidence refs</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {evidenceRefs.map((ref) => (
                <span key={ref} className="inline-flex max-w-full items-center break-words rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] leading-tight text-stone-200">
                  {ref}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Warum noch nicht freigeben?</p>
            <p className="mt-2 text-sm leading-5 text-stone-200">{firstBlocker ?? 'Human review is still required.'}</p>
            {firstGate ? <p className="mt-2 font-mono text-xs text-amber-100">{firstGate.id}: {firstGate.mode}</p> : null}
          </div>

          <div className="rounded-lg border border-rose-300/25 bg-rose-300/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Write Guard</p>
            <p className="mt-2 text-sm leading-5 text-stone-200">
              Dieser Entwurf ist nur Anzeige. Er schreibt kein Decision Record, setzt keine Rolle, oeffnet kein Tool und
              veraendert kein Projektpaket.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
