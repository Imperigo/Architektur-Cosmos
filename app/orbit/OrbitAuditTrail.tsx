import auditTrailContractData from '@/examples/kosmo-orbit/audit/orbit-audit-trail.contract.json';

type AuditOutcome = 'blocked' | 'local_check' | 'review_enabled';

type AuditEvent = {
  id: string;
  command_id: string;
  actor_role: string;
  intent: string;
  evidence: string;
  gate: string;
  outcome: AuditOutcome;
  writes: boolean;
};

type AuditTrailContract = {
  mode: string;
  events: AuditEvent[];
};

const auditTrailContract = auditTrailContractData as AuditTrailContract;

const outcomeTone: Record<AuditOutcome, string> = {
  blocked: 'border-rose-300/35 bg-rose-400/10 text-rose-100',
  local_check: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
  review_enabled: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100'
};

export function OrbitAuditTrail() {
  return (
    <section className="rounded-lg border border-indigo-300/20 bg-indigo-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">Audit-Trail-Vertrag</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie KosmoOrbit spaeter jede Aktion nachvollziehbar macht</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Bevor KosmoOrbit echte Kommandos ausfuehrt, muss jede Aktion als nachvollziehbarer Eintrag gedacht
            werden: Rolle, Intent, Evidenz, Gate und Ergebnis. Heute ist das nur ein statischer Vertrag und schreibt
            keine Userdaten.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-indigo-300/35 bg-indigo-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-indigo-100">
          static-audit-trail-contract
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {auditTrailContract.events.map((event) => (
          <article key={event.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-white">{event.intent}</h3>
                <p className="mt-1 break-words text-xs uppercase tracking-[0.14em] text-stone-500">{event.command_id} / {event.actor_role}</p>
              </div>
              <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${outcomeTone[event.outcome]}`}>
                {event.outcome}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-5">
              <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
                Evidenz: {event.evidence}
              </p>
              <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                Gate: {event.gate}
              </p>
              <p className="rounded-md border border-indigo-300/20 bg-indigo-300/10 px-3 py-2 text-xs text-indigo-100">
                Writes: {event.writes ? 'ja' : 'nein'}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
