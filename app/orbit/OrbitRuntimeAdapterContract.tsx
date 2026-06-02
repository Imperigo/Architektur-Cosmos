import runtimeAdapterContractData from '@/examples/kosmo-orbit/runtime/orbit-runtime-adapter.contract.json';

type RuntimeAdapterLane = {
  id: string;
  label: string;
  target: string;
  future_capability: string;
  today_contract: string;
  required_evidence: string[];
  human_gate: string;
  blocked_side_effects: string[];
};

type RuntimeAdapterContract = {
  status: string;
  mode: string;
  adapter_lanes: RuntimeAdapterLane[];
  promotion_requirements: string[];
};

const runtimeAdapterContract = runtimeAdapterContractData as RuntimeAdapterContract;

function Chip({ label, tone = 'neutral' }: { label: string; tone?: 'cyan' | 'amber' | 'rose' | 'neutral' }) {
  const toneClass = {
    cyan: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
    amber: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
    rose: 'border-rose-300/40 bg-rose-400/10 text-rose-100',
    neutral: 'border-white/10 bg-white/[0.05] text-stone-300'
  }[tone];

  return (
    <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] leading-tight ${toneClass}`}>
      {label}
    </span>
  );
}

export function OrbitRuntimeAdapterContract() {
  return (
    <section className="rounded-lg border border-violet-300/20 bg-violet-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-100">Runtime Adapter</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Bruecke von KosmoOrbit zur lokalen KosmoZentrale</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">
            Dieser Vertrag beschreibt die Adapter, die spaeter lokale Hardware, Kosmo, Blender-Tools,
            Jobs, Audit und Publish verbinden koennten. Heute bleibt alles statisch: keine Adapter werden
            ausgefuehrt, kein Prozess wird gestartet, keine Daten werden geschrieben und keine externen
            Konten werden beruehrt.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip label={runtimeAdapterContract.status} tone="cyan" />
          <Chip label={runtimeAdapterContract.mode} />
          <Chip label={`${runtimeAdapterContract.adapter_lanes.length} adapter lanes`} tone="amber" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {runtimeAdapterContract.adapter_lanes.map((lane) => (
          <article key={lane.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-white">{lane.label}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">{lane.target}</p>
              </div>
              <Chip label={lane.id} />
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-5">
              <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
                Spaeter: {lane.future_capability}
              </p>
              <p className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-cyan-100">
                Heute: {lane.today_contract}
              </p>
              <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-amber-100">
                Human Gate: {lane.human_gate}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lane.required_evidence.map((evidence) => (
                <Chip key={evidence} label={evidence} tone="cyan" />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lane.blocked_side_effects.map((effect) => (
                <Chip key={effect} label={effect} tone="rose" />
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Promotion Requirements</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {runtimeAdapterContract.promotion_requirements.map((requirement) => (
            <p key={requirement} className="rounded-md border border-white/10 bg-black/24 px-3 py-2 text-sm leading-5 text-stone-200">
              {requirement}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
