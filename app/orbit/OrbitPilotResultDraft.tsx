import pilotResultDraftData from '@/examples/kosmo-orbit/pilot/orbit-office-pilot-result-draft.demo.json';

type ResultSlot = {
  id: string;
  label: string;
  source_measurement: string;
  value: number | null;
  unit: string;
  human_note: string | null;
  evidence_ref: string | null;
};

type PilotResultDraft = {
  result_draft: {
    id: string;
    status: string;
    mode: string;
    scope: string;
  };
  safety: Record<string, boolean>;
  result_slots: ResultSlot[];
  evidence_review: {
    status: string;
    required_sources: string[];
    missing_sources: string[];
  };
  publication: {
    status: string;
    allowed_public_claims: string[];
    blocked_claims: string[];
  };
  decision: {
    status: string;
    selected_option: string | null;
    human_reviewer: string | null;
  };
};

const pilotResultDraft = pilotResultDraftData as PilotResultDraft;

function formatId(value: string) {
  return value.replace(/_/g, ' ').replace(/-/g, ' ');
}

export function OrbitPilotResultDraft() {
  const emptySlotCount = pilotResultDraft.result_slots.filter((slot) => (
    slot.value === null && slot.human_note === null && slot.evidence_ref === null
  )).length;

  return (
    <section className="rounded-lg border border-sky-300/20 bg-sky-300/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">Pilot Result Draft</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Ergebnisstruktur bereit, noch kein Pilotresultat</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieser Draft nimmt spaeter echte menschliche Pilotbeobachtungen auf.
            Heute bleiben Werte, Notizen, Evidenzreferenzen, Review und Public Claims leer oder blockiert.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-sky-300/35 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-sky-100">
          {formatId(pilotResultDraft.result_draft.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr_0.85fr]">
        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Draft</p>
          <div className="mt-3 grid gap-2 text-sm">
            <p className="rounded-md bg-white/[0.04] px-3 py-2 text-stone-200">Mode: {formatId(pilotResultDraft.result_draft.mode)}</p>
            <p className="rounded-md bg-white/[0.04] px-3 py-2 text-stone-200">Evidence Review: {formatId(pilotResultDraft.evidence_review.status)}</p>
            <p className="rounded-md border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-emerald-100">
              Leere Result-Slots: {emptySlotCount}/{pilotResultDraft.result_slots.length}
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">Result-Slots</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pilotResultDraft.result_slots.map((slot) => (
              <article key={slot.id} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
                <h3 className="text-sm font-semibold text-white">{slot.label}</h3>
                <p className="mt-1 text-xs leading-5 text-stone-400">{slot.source_measurement} - {slot.unit}</p>
                <p className="mt-2 rounded border border-white/10 bg-black/24 px-2 py-1 text-xs text-stone-300">
                  value null - note null - evidence null
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-rose-300/20 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Public Claims</p>
          <p className="mt-3 rounded-md border border-rose-300/20 bg-black/24 px-3 py-2 text-sm text-rose-100">
            Publication: {formatId(pilotResultDraft.publication.status)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pilotResultDraft.publication.blocked_claims.map((claim) => (
              <span key={claim} className="inline-flex max-w-full items-center break-words rounded-full border border-rose-300/25 bg-black/24 px-2.5 py-1 text-xs leading-tight text-rose-100">
                {claim}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-sm leading-5 text-amber-100">
        Fehlende Evidenz: {pilotResultDraft.evidence_review.missing_sources.map(formatId).join(', ')}.
        Entscheidung bleibt {formatId(pilotResultDraft.decision.status)}.
      </div>
    </section>
  );
}
