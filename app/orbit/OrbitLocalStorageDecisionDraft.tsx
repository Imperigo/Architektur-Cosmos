import localStorageDecisionDraftData from '@/examples/kosmo-orbit/storage/orbit-local-storage-decision.draft.json';

type DecisionField = {
  id: string;
  label: string;
  question: string;
  required_evidence: string[];
  status: string;
};

type LocalStorageDecisionDraft = {
  status: string;
  mode: string;
  decision_statement: string;
  decision_fields: DecisionField[];
  blocked_until_decision: string[];
  allowed_today: string[];
  approval_roles: string[];
};

const localStorageDecisionDraft = localStorageDecisionDraftData as LocalStorageDecisionDraft;

function pretty(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitLocalStorageDecisionDraft() {
  return (
    <section className="rounded-lg border border-amber-200/20 bg-black/30 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Local Storage Decision Draft</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Welche Speicherentscheidung vor echtem Memory noetig ist</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieser Entwurf ist kein Speicher-Setup. Er macht sichtbar, was ein Architekturburo menschlich entscheiden
            muss, bevor KosmoOrbit lokale Daten schreiben darf: Speicherort, Retention, Delete/Export/Restore,
            Backup-Test, Rollen-Sichtbarkeit und Datenschutz. Heute bleibt alles blockiert: kein local storage write,
            kein Memory-Write, kein Kundendaten-Index, kein Embedding-Job, kein Backup-Job, kein Restore-Job und kein externer Sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-100">
            {localStorageDecisionDraft.status}
          </span>
          <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-cyan-100">
            {localStorageDecisionDraft.mode}
          </span>
          <span className="rounded-full border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-100">
            {localStorageDecisionDraft.blocked_until_decision.length} blocked
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Decision Statement</p>
          <p className="mt-2 text-sm leading-6 text-amber-50/90">{localStorageDecisionDraft.decision_statement}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {localStorageDecisionDraft.approval_roles.map((role) => (
              <span key={role} className="rounded-full border border-amber-200/30 bg-black/24 px-2.5 py-1 text-[11px] text-amber-50/90">
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Bis Entscheid blockiert</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {localStorageDecisionDraft.blocked_until_decision.map((capability) => (
              <span key={capability} className="rounded-full border border-rose-300/30 bg-black/24 px-2.5 py-1 font-mono text-[11px] text-rose-50/90">
                {capability}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {localStorageDecisionDraft.decision_fields.map((field) => (
          <article key={field.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{pretty(field.id)}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{field.label}</h3>
            <p className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm leading-5 text-cyan-50/90">
              {field.question}
            </p>
            <ul className="mt-3 space-y-1 text-sm leading-5 text-stone-300">
              {field.required_evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">
              {field.status}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Heute erlaubt</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {localStorageDecisionDraft.allowed_today.map((item) => (
            <p key={item} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-cyan-50/90">
              {pretty(item)}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
