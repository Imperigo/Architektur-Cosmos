import cadenceGuardData from '@/examples/kosmo-orbit/memory/orbit-fire-cadence-guard.contract.json';

type FireCadenceRecord = {
  id: string;
  local_time: string;
  delta_from_previous_minutes: number | null;
  cadence_state: string;
  reason?: string;
};

type FireCadenceGuard = {
  status: string;
  mode: string;
  timezone: string;
  target_interval_minutes: number;
  purpose: string;
  observed_fires: FireCadenceRecord[];
  cadence_policy: {
    preferred_fire_scope: string;
    max_recommended_work_minutes: number;
    summary_minute_budget: number;
    large_change_rule: string;
    no_false_cadence_claim: boolean;
  };
  current_assessment: {
    cadence_perfect: boolean;
    cadence_documented: boolean;
    work_quality_green: boolean;
    recommendation: string;
  };
  blocked_today: string[];
  next_actions: string[];
};

const cadenceGuard = cadenceGuardData as FireCadenceGuard;

function badgeTone(state: string) {
  if (state === 'start') return 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100';
  if (state === 'catch_up_record') return 'border-sky-300/35 bg-sky-300/10 text-sky-100';
  return 'border-amber-300/35 bg-amber-300/10 text-amber-100';
}

function Label({ children, tone = 'neutral' }: { children: string; tone?: 'green' | 'red' | 'blue' | 'neutral' }) {
  const toneClass = {
    green: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
    red: 'border-rose-300/30 bg-rose-400/10 text-rose-100',
    blue: 'border-sky-300/30 bg-sky-400/10 text-sky-100',
    neutral: 'border-white/10 bg-white/[0.04] text-stone-200'
  }[tone];

  return <span className={`rounded-full border px-2.5 py-1 text-xs leading-tight ${toneClass}`}>{children}</span>;
}

export function OrbitFireCadenceGuard() {
  const driftedCount = cadenceGuard.observed_fires.filter((fire) => fire.cadence_state === 'drifted').length;

  return (
    <section className="rounded-lg border border-amber-200/22 bg-amber-300/[0.045] p-4 shadow-[0_18px_70px_rgba(217,119,6,0.12)] lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Fire Cadence Guard</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-stone-50">5-Minuten-Takt ehrlich pruefen</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            {cadenceGuard.purpose} Der Guard behauptet keinen perfekten Rhythmus, sondern zeigt die reale Drift und
            haelt den naechsten Fire bewusst kleiner.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-amber-200/15 bg-amber-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">Ziel</p>
              <p className="mt-1 font-mono text-lg text-amber-100">{cadenceGuard.target_interval_minutes} Minuten</p>
            </div>
            <div className="rounded-md border border-cyan-200/15 bg-cyan-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">Fires</p>
              <p className="mt-1 font-mono text-lg text-cyan-100">{cadenceGuard.observed_fires.length}</p>
            </div>
            <div className="rounded-md border border-rose-200/15 bg-rose-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">Drifted</p>
              <p className="mt-1 font-mono text-lg text-rose-100">{driftedCount}</p>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-white/10 bg-black/18 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Sicherheitsgrenze</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              Review-only: kein Daemon, kein externer Scheduler, kein Push, kein Deploy und kein Verstecken von Drift.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {cadenceGuard.blocked_today.map((item) => (
                <Label key={item} tone="red">
                  {item.replaceAll('_', ' ')}
                </Label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Cadence Timeline</p>
          <div className="mt-3 grid gap-3">
            {cadenceGuard.observed_fires.map((fire) => (
              <article key={fire.id} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-100">{fire.local_time}</h3>
                  <span className={`rounded-full border px-2.5 py-1 text-xs leading-tight ${badgeTone(fire.cadence_state)}`}>
                    {fire.cadence_state}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-400">
                  Delta:{' '}
                  <span className="font-mono text-stone-200">
                    {fire.delta_from_previous_minutes === null ? 'Start' : `${fire.delta_from_previous_minutes} Minuten`}
                  </span>
                </p>
                {fire.reason ? <p className="mt-2 text-xs leading-5 text-stone-400">{fire.reason}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Policy</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Label tone="green">{cadenceGuard.cadence_policy.preferred_fire_scope}</Label>
            <Label tone="green">max {cadenceGuard.cadence_policy.max_recommended_work_minutes} min Arbeit</Label>
            <Label tone="green">{cadenceGuard.cadence_policy.summary_minute_budget} min Summary</Label>
            <Label tone="blue">no false cadence claim</Label>
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-300">{cadenceGuard.cadence_policy.large_change_rule}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">Naechste kleine Aktion</p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-stone-300">
            {cadenceGuard.next_actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
