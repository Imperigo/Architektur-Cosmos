import heavyCheckData from '@/examples/kosmo-orbit/review/orbit-heavy-check-timebox.generated.json';
import toolchainReadinessData from '@/examples/kosmo-orbit/health/orbit-toolchain-readiness.contract.json';

type ReadinessLane = {
  id: string;
  label: string;
  current_state: string;
  evidence: string[];
  orbit_meaning: string;
};

type ToolchainReadiness = {
  status: string;
  mode: string;
  purpose: string;
  readiness_lanes: ReadinessLane[];
  release_gate_policy: Record<string, boolean>;
  blocked_today: string[];
  next_actions: string[];
};

type HeavyCheck = {
  id: string;
  label: string;
  status: string;
  duration_ms: number;
  timeout_ms: number;
};

type HeavyCheckReport = {
  status: string;
  environment: {
    node: string;
    platform: string;
    arch: string;
  };
  summary: {
    passed_checks: number;
    check_count: number;
    timed_out_checks: number;
  };
  checks: HeavyCheck[];
};

const readiness = toolchainReadinessData as ToolchainReadiness;
const heavyCheck = heavyCheckData as HeavyCheckReport;

const stateTone: Record<string, string> = {
  passed: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
  timeout_blocker: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
  environment_variance: 'border-sky-300/30 bg-sky-400/10 text-sky-100'
};

function stateClass(state: string) {
  return stateTone[state] ?? 'border-white/10 bg-white/[0.04] text-stone-200';
}

export function OrbitToolchainReadiness() {
  const timedOutChecks = heavyCheck.checks.filter((item) => item.status === 'timed_out');

  return (
    <section className="rounded-lg border border-amber-200/20 bg-amber-300/[0.045] p-4 shadow-[0_18px_70px_rgba(180,83,9,0.13)] lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Toolchain Readiness</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-stone-50">Schwere Checks als klares Release-Gate</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            {readiness.purpose} Die kritischen Lanes bleiben TypeScript, ESLint und Next Static Build.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-emerald-200/15 bg-emerald-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">Fast Checks</p>
              <p className="mt-1 font-mono text-lg text-emerald-100">
                {heavyCheck.summary.passed_checks}/{heavyCheck.summary.check_count}
              </p>
            </div>
            <div className="rounded-md border border-amber-200/15 bg-amber-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">Timeouts</p>
              <p className="mt-1 font-mono text-lg text-amber-100">{heavyCheck.summary.timed_out_checks}</p>
            </div>
            <div className="rounded-md border border-sky-200/15 bg-sky-300/[0.055] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100">Runtime</p>
              <p className="mt-1 text-sm font-semibold text-sky-100">
                {heavyCheck.environment.node} / {heavyCheck.environment.arch}
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-md border border-rose-200/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-100">
            Release-Grenze: kein falsches Gruen, kein Static-Smoke ohne Build, kein Push, kein Deploy und keine
            Cloudflare-Live-Behauptung aus schnellen Review-Checks.
          </p>
        </div>

        <div className="grid gap-3">
          {readiness.readiness_lanes.map((lane) => (
            <article key={lane.id} className="rounded-md border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-stone-100">{lane.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-stone-400">{lane.orbit_meaning}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stateClass(lane.current_state)}`}>
                  {lane.current_state.replaceAll('_', ' ')}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {lane.evidence.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-stone-300">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Timeout-Evidenz</p>
          <div className="mt-3 grid gap-2">
            {timedOutChecks.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200/10 bg-amber-300/[0.045] px-3 py-2 text-xs">
                <span className="font-semibold text-stone-100">{item.label}</span>
                <span className="font-mono text-amber-100">
                  {item.status} / {Math.round(item.duration_ms / 1000)}s
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Heute blockiert</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {readiness.blocked_today.map((item) => (
              <span key={item} className="rounded-full border border-rose-300/20 bg-rose-400/[0.07] px-2.5 py-1 text-xs text-rose-100">
                {item.replaceAll('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
