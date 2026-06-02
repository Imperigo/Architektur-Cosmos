import officeMemoryReadinessData from '@/examples/kosmo-orbit/memory/orbit-office-memory-readiness.contract.json';

type MemoryLane = {
  id: string;
  label: string;
  future_role: string;
  readiness_gate: string;
  review_only_today: string[];
  blocked_today: string[];
};

type OfficeMemoryReadiness = {
  status: string;
  mode: string;
  readiness_principles: string[];
  memory_lanes: MemoryLane[];
  readiness_gates: string[];
  blocked_capabilities: string[];
};

const officeMemoryReadiness = officeMemoryReadinessData as OfficeMemoryReadiness;

function pretty(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitOfficeMemoryReadiness() {
  return (
    <section className="rounded-lg border border-cyan-200/20 bg-black/30 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Office Memory Readiness</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Was spaeter lokales Buero-Gedaechtnis werden darf</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Nach Data Governance braucht KosmoOrbit eine Memory-Grenze: Projektkontext, Entscheide,
            Asset-Evidenz, Ausbildung und Betrieb duerfen spaeter lokal erinnert werden. Heute bleibt das
            review-only: kein Memory-Write, kein Kundendatei-Scan, kein Embedding-Job, kein Backup-Status-Write,
            kein externer Memory-Sync und kein Cloud Vector Store.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-cyan-100">
            {officeMemoryReadiness.status}
          </span>
          <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-100">
            {officeMemoryReadiness.mode}
          </span>
          <span className="rounded-full border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-100">
            {officeMemoryReadiness.blocked_capabilities.length} blocked
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Prinzipien</p>
          <div className="mt-3 grid gap-2">
            {officeMemoryReadiness.readiness_principles.map((principle) => (
              <p key={principle} className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm leading-5 text-cyan-50/90">
                {principle}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Heute blockiert</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {officeMemoryReadiness.blocked_capabilities.map((capability) => (
              <span key={capability} className="rounded-full border border-rose-300/30 bg-black/24 px-2.5 py-1 font-mono text-[11px] text-rose-50/90">
                {capability}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {officeMemoryReadiness.memory_lanes.map((lane) => (
          <article key={lane.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{pretty(lane.id)}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{lane.label}</h3>
            <p className="mt-3 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm leading-5 text-cyan-50/90">
              {lane.future_role}
            </p>
            <p className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100">
              Gate: {lane.readiness_gate}
            </p>
            <div className="mt-3 rounded-md border border-white/10 bg-black/24 p-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Heute nur Review</p>
              <ul className="mt-1 space-y-1 text-sm leading-5 text-stone-300">
                {lane.review_only_today.map((item) => (
                  <li key={item}>{pretty(item)}</li>
                ))}
              </ul>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lane.blocked_today.map((item) => (
                <span key={item} className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 font-mono text-[11px] text-rose-100">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Readiness Gates</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {officeMemoryReadiness.readiness_gates.map((gate) => (
            <p key={gate} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-stone-200">
              {pretty(gate)}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
