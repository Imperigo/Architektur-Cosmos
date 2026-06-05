import githubImperigoGateData from '@/examples/kosmo-orbit/governance/orbit-github-imperigo-gate.contract.json';

type GateAction = {
  id: string;
  label: string;
  reason?: string;
  examples?: string[];
  allowed?: boolean;
};

type GitHubImperigoGate = {
  status: string;
  mode: string;
  title: string;
  purpose: string;
  source_goal_terms: string[];
  local_autonomy: GateAction[];
  owner_go_required: GateAction[];
  imperigo_fire_protocol: {
    interval_minutes: number;
    until_local_time: string;
    requires_time_check: boolean;
    requires_summary: boolean;
    requires_memory_update: boolean;
    requires_safe_scope: boolean;
  };
  publish_evidence_required: string[];
  blocked_today: string[];
};

const gate = githubImperigoGateData as GitHubImperigoGate;

function Pill({ children, tone = 'neutral' }: { children: string; tone?: 'green' | 'red' | 'yellow' | 'neutral' }) {
  const toneClass = {
    green: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
    red: 'border-rose-300/30 bg-rose-400/10 text-rose-100',
    yellow: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
    neutral: 'border-white/10 bg-white/[0.04] text-stone-200'
  }[tone];

  return <span className={`rounded-full border px-2.5 py-1 text-xs leading-tight ${toneClass}`}>{children}</span>;
}

export function OrbitGitHubImperigoGate() {
  return (
    <section className="rounded-lg border border-sky-200/20 bg-sky-300/[0.045] p-4 shadow-[0_18px_70px_rgba(14,116,144,0.13)] lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">GitHub Imperigo Gate</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-stone-50">Automation sichtbar, externe Wirkung gesperrt</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            {gate.purpose} Der 5-Minuten-Fire bleibt ein lokaler Takt fuer Evidenz, Zusammenfassung und Memory.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-emerald-200/15 bg-emerald-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">Lokal erlaubt</p>
              <p className="mt-1 font-mono text-lg text-emerald-100">{gate.local_autonomy.length}</p>
            </div>
            <div className="rounded-md border border-rose-200/15 bg-rose-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">Owner-Go</p>
              <p className="mt-1 font-mono text-lg text-rose-100">{gate.owner_go_required.length}</p>
            </div>
            <div className="rounded-md border border-amber-200/15 bg-amber-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">Fire</p>
              <p className="mt-1 text-sm font-semibold text-amber-100">
                {gate.imperigo_fire_protocol.interval_minutes} Min bis {gate.imperigo_fire_protocol.until_local_time}
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-md border border-rose-200/20 bg-rose-400/[0.07] p-3 text-xs leading-5 text-rose-100">
            Safety: kein Push, kein Deploy, keine GitHub-Mutation, keine Secrets, keine externen CI-Aenderungen und
            keine Live-Claims ohne Owner-Go und belastbare Toolchain-Evidenz.
          </p>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-emerald-200/15 bg-emerald-300/[0.05] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Lokale Autonomie</p>
            <div className="mt-3 grid gap-2">
              {gate.local_autonomy.map((item) => (
                <article key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-stone-100">{item.label}</h3>
                    <Pill tone="green">allowed local</Pill>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(item.examples ?? []).map((example) => (
                      <Pill key={example}>{example}</Pill>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-rose-200/15 bg-rose-300/[0.05] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Owner-Go erforderlich</p>
            <div className="mt-3 grid gap-2">
              {gate.owner_go_required.map((item) => (
                <article key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-stone-100">{item.label}</h3>
                    <Pill tone="red">blocked</Pill>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-stone-400">{item.reason}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">Publish-Evidenz vor Push</p>
          <ul className="mt-3 space-y-2">
            {gate.publish_evidence_required.map((item) => (
              <li key={item} className="rounded-md border border-sky-200/10 bg-sky-300/[0.045] p-2 text-xs leading-5 text-stone-300">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Heute blockiert</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {gate.blocked_today.map((item) => (
              <Pill key={item} tone="yellow">
                {item.replaceAll('_', ' ')}
              </Pill>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
