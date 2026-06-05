import pushDecisionDraftData from '@/examples/kosmo-orbit/governance/orbit-push-decision-draft.contract.json';

type EvidenceItem = {
  id: string;
  status: string;
  evidence?: string;
  reason?: string;
};

type PushDecisionDraft = {
  status: string;
  title: string;
  purpose: string;
  decision_state: {
    recommended_decision_now: string;
    push_ready_now: boolean;
    owner_go_required: boolean;
    reason: string;
  };
  current_positive_evidence: EvidenceItem[];
  blocking_evidence: EvidenceItem[];
  owner_go_checklist: string[];
  prepared_summary: {
    draft_commit_scope: string;
    draft_risk_note: string;
    draft_release_note: string;
  };
  blocked_today: string[];
};

const draft = pushDecisionDraftData as PushDecisionDraft;

function Badge({ children, tone = 'neutral' }: { children: string; tone?: 'green' | 'red' | 'yellow' | 'neutral' }) {
  const toneClass = {
    green: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
    red: 'border-rose-300/30 bg-rose-400/10 text-rose-100',
    yellow: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
    neutral: 'border-white/10 bg-white/[0.04] text-stone-200'
  }[tone];

  return <span className={`rounded-full border px-2.5 py-1 text-xs leading-tight ${toneClass}`}>{children}</span>;
}

export function OrbitPushDecisionDraft() {
  return (
    <section className="rounded-lg border border-rose-200/20 bg-rose-300/[0.04] p-4 shadow-[0_18px_70px_rgba(190,18,60,0.12)] lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-100">Push Decision Draft</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-stone-50">Lokaler Entscheid, kein Push</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            {draft.purpose} Aktuelle Empfehlung: hold_local bis Owner-Go und belastbare Heavy-Check-Evidenz vorliegen.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-amber-200/15 bg-amber-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">Entscheid jetzt</p>
              <p className="mt-1 font-mono text-sm text-amber-100">{draft.decision_state.recommended_decision_now}</p>
            </div>
            <div className="rounded-md border border-rose-200/15 bg-rose-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">Push ready</p>
              <p className="mt-1 font-mono text-sm text-rose-100">{draft.decision_state.push_ready_now ? 'yes' : 'no'}</p>
            </div>
            <div className="rounded-md border border-sky-200/15 bg-sky-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100">Owner-Go</p>
              <p className="mt-1 font-mono text-sm text-sky-100">{draft.decision_state.owner_go_required ? 'required' : 'not required'}</p>
            </div>
          </div>
          <p className="mt-4 rounded-md border border-rose-200/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-100">
            Safety: kein Push, kein Deploy, keine GitHub-Mutation, keine Secrets, keine Dependency-Installation,
            kein Live-Claim und keine Kostenjobs.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-emerald-200/15 bg-emerald-300/[0.05] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Positive Evidenz</p>
            <div className="mt-3 grid gap-2">
              {draft.current_positive_evidence.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs">
                  <span className="font-semibold text-stone-100">{item.id.replaceAll('_', ' ')}</span>
                  <Badge tone="green">{item.evidence ?? item.status}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-amber-200/15 bg-amber-300/[0.05] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Blockierende Evidenz</p>
            <div className="mt-3 grid gap-2">
              {draft.blocking_evidence.map((item) => (
                <div key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-stone-100">{item.id.replaceAll('_', ' ')}</span>
                    <Badge tone="yellow">{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-400">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">Owner-Go Checklist</p>
          <ul className="mt-3 space-y-2">
            {draft.owner_go_checklist.map((item) => (
              <li key={item} className="rounded-md border border-sky-200/10 bg-sky-300/[0.045] p-2 text-xs leading-5 text-stone-300">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">Prepared Summary</p>
          <div className="mt-3 space-y-2 text-xs leading-5 text-stone-300">
            <p>{draft.prepared_summary.draft_commit_scope}</p>
            <p>{draft.prepared_summary.draft_risk_note}</p>
            <p>{draft.prepared_summary.draft_release_note}</p>
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Heute blockiert</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {draft.blocked_today.map((item) => (
              <Badge key={item} tone="red">
                {item.replaceAll('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
