import deleteExportRestoreDrillData from '@/examples/kosmo-orbit/storage/orbit-delete-export-restore-drill.contract.json';

type DrillScope = {
  id: string;
  label: string;
  purpose: string;
  required_evidence: string[];
  status: string;
};

type DeleteExportRestoreDrill = {
  status: string;
  mode: string;
  drill_statement: string;
  drill_scope: DrillScope[];
  blocked_until_drill: string[];
  allowed_today: string[];
  review_roles: string[];
  promotion_requirements: string[];
};

const deleteExportRestoreDrill = deleteExportRestoreDrillData as DeleteExportRestoreDrill;

function pretty(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitDeleteExportRestoreDrill() {
  return (
    <section className="rounded-lg border border-emerald-200/20 bg-black/30 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Delete / Export / Restore Drill</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie KosmoOrbit lokale Daten reversibel und pruefbar halten muss</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieser Drill startet keine Speicheraktion. Er zeigt nur, welche menschlichen Pruefschritte noetig sind, bevor
            KosmoOrbit spaeter Loeschen, Exportieren oder Wiederherstellen lokal ausfuehren darf. Heute gilt: kein real delete job,
            kein real export job, kein real restore job, kein Kundendaten-Export, kein Kundendaten-Delete, kein Backup-Restore und
            kein externer Archiv-Sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-100">
            {deleteExportRestoreDrill.status}
          </span>
          <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-cyan-100">
            {deleteExportRestoreDrill.mode}
          </span>
          <span className="rounded-full border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-100">
            {deleteExportRestoreDrill.blocked_until_drill.length} blocked
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Drill Statement</p>
          <p className="mt-2 text-sm leading-6 text-emerald-50/90">{deleteExportRestoreDrill.drill_statement}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {deleteExportRestoreDrill.review_roles.map((role) => (
              <span key={role} className="rounded-full border border-emerald-200/30 bg-black/24 px-2.5 py-1 text-[11px] text-emerald-50/90">
                {role}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Bis Drill blockiert</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {deleteExportRestoreDrill.blocked_until_drill.map((capability) => (
              <span key={capability} className="rounded-full border border-rose-300/30 bg-black/24 px-2.5 py-1 font-mono text-[11px] text-rose-50/90">
                {capability}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {deleteExportRestoreDrill.drill_scope.map((item) => (
          <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{pretty(item.id)}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{item.label}</h3>
            <p className="mt-3 text-sm leading-5 text-stone-300">{item.purpose}</p>
            <ul className="mt-3 space-y-1 text-sm leading-5 text-stone-300">
              {item.required_evidence.map((evidence) => (
                <li key={evidence}>{evidence}</li>
              ))}
            </ul>
            <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100">
              {item.status}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Heute erlaubt</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {deleteExportRestoreDrill.allowed_today.map((item) => (
              <p key={item} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-cyan-50/90">
                {pretty(item)}
              </p>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">Promotion Requirements</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {deleteExportRestoreDrill.promotion_requirements.map((item) => (
              <p key={item} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-emerald-50/90">
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
