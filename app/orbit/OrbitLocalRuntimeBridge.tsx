import localRuntimeBridgeData from '@/examples/kosmo-orbit/review/orbit-local-runtime-bridge.generated.json';

type RuntimeLane = {
  id: string;
  label: string;
  status: string;
  evidence: string;
  next_action: string;
};

type LocalRuntimeBridgeReport = {
  status: string;
  mode: string;
  policy: Record<string, boolean>;
  summary: {
    passed_checks: number;
    check_count: number;
    progress_percent: number;
    ready_lanes: number;
    blocked_lanes: number;
  };
  control_spine: {
    goal: string;
    progress_bar: string;
    generated_at: string;
  };
  lanes: RuntimeLane[];
  sources: {
    local_starter_commit: string | null;
    cloud_starter_commit: string | null;
    orbit_website_commit: string | null;
  };
};

const localRuntimeBridge = localRuntimeBridgeData as LocalRuntimeBridgeReport;

function BridgeChip({ label, tone = 'neutral' }: { label: string; tone?: 'cyan' | 'green' | 'amber' | 'rose' | 'neutral' }) {
  const toneClass = {
    cyan: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
    green: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
    rose: 'border-rose-300/40 bg-rose-400/10 text-rose-100',
    neutral: 'border-white/10 bg-white/[0.05] text-stone-300'
  }[tone];

  return (
    <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] leading-tight ${toneClass}`}>
      {label}
    </span>
  );
}

function laneTone(status: string) {
  if (status === 'ready') return 'green';
  if (status === 'blocked') return 'rose';
  return 'amber';
}

export function OrbitLocalRuntimeBridge() {
  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Local Runtime Bridge</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Odysseus/KOSMO Night Status in KosmoOrbit</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">
            Diese Sektion zeigt den lokalen KOSMO Control Spine als statisches Review-Artefakt in Orbit. Sie
            liest nur den erzeugten Night-Status-Report, startet keine Prozesse, keine Modelle, scannt keine
            privaten Dateien und fuehrt keine Uploads oder Publish-Aktionen aus.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BridgeChip label={localRuntimeBridge.status} tone="green" />
          <BridgeChip label={`${localRuntimeBridge.summary.passed_checks}/${localRuntimeBridge.summary.check_count} checks`} tone="cyan" />
          <BridgeChip label={localRuntimeBridge.mode} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Control Spine</p>
          <p className="mt-2 text-3xl font-semibold text-white">{localRuntimeBridge.summary.progress_percent}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-emerald-300" style={{ width: `${localRuntimeBridge.summary.progress_percent}%` }} />
          </div>
          <code className="mt-3 block break-words rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs leading-5 text-emerald-100">
            {localRuntimeBridge.control_spine.progress_bar}
          </code>
          <p className="mt-3 text-sm leading-6 text-stone-300">{localRuntimeBridge.control_spine.goal}</p>
          <div className="mt-3 grid gap-2 text-sm leading-5 sm:grid-cols-2">
            <p className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
              {localRuntimeBridge.summary.ready_lanes} ready lanes
            </p>
            <p className="rounded-md border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-rose-100">
              {localRuntimeBridge.summary.blocked_lanes} blocked lane
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/24 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Quellen</p>
          <div className="mt-3 grid gap-2 text-sm leading-5 sm:grid-cols-3">
            <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
              Local Starter <code className="block text-emerald-100">{localRuntimeBridge.sources.local_starter_commit}</code>
            </p>
            <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
              OneDrive Starter <code className="block text-cyan-100">{localRuntimeBridge.sources.cloud_starter_commit}</code>
            </p>
            <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
              Orbit Website <code className="block text-violet-100">{localRuntimeBridge.sources.orbit_website_commit}</code>
            </p>
          </div>
          <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100">
            GitHub-Trennung bleibt sichtbar blockiert, bis ein dediziertes Starter-Repo existiert oder ein
            Import explizit freigegeben ist.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {localRuntimeBridge.lanes.map((lane) => (
          <article key={lane.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="break-words text-base font-semibold text-white">{lane.label}</h3>
              <BridgeChip label={lane.status} tone={laneTone(lane.status)} />
            </div>
            <p className="mt-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm leading-5 text-stone-300">
              {lane.evidence}
            </p>
            <p className="mt-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs leading-5 text-cyan-100">
              Next: {lane.next_action}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {Object.entries(localRuntimeBridge.policy).map(([key, enabled]) => (
          <BridgeChip key={key} label={key} tone={enabled ? 'green' : 'rose'} />
        ))}
      </div>
    </section>
  );
}
