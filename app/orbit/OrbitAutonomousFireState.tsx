import autonomousFireStateData from '@/examples/kosmo-orbit/memory/orbit-autonomous-fire-state.contract.json';

type MemoryEntry = {
  id: string;
  status: string;
  memory: string;
};

type AutonomousFireState = {
  status: string;
  mode: string;
  date_local: string;
  timezone: string;
  loop_goal: {
    label: string;
    fire_interval_minutes: number;
    worker: string;
    focus: string;
    summary_required_each_fire: boolean;
    memory_capture_required: boolean;
  };
  current_fire: {
    local_time: string;
    state: string;
    last_confirmed_safe_scope: string;
    known_blockers: string[];
  };
  autonomous_permissions: {
    allowed_without_question: string[];
    ask_or_explicit_go_required: string[];
  };
  addon_memory: MemoryEntry[];
  own_memory: string[];
  next_safe_actions: string[];
  blocked_today: string[];
};

const autonomousFireState = autonomousFireStateData as AutonomousFireState;

function ChipList({ items, tone = 'neutral' }: { items: string[]; tone?: 'blue' | 'green' | 'neutral' | 'red' | 'yellow' }) {
  const toneClass = {
    blue: 'border-sky-300/30 bg-sky-400/10 text-sky-100',
    green: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
    neutral: 'border-white/10 bg-white/[0.04] text-stone-200',
    red: 'border-rose-300/30 bg-rose-400/10 text-rose-100',
    yellow: 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  }[tone];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full border px-2.5 py-1 text-xs leading-tight ${toneClass}`}>
          {item.replaceAll('_', ' ')}
        </span>
      ))}
    </div>
  );
}

export function OrbitAutonomousFireState() {
  return (
    <section className="rounded-lg border border-violet-200/20 bg-violet-300/[0.045] p-4 shadow-[0_18px_70px_rgba(76,29,149,0.16)] lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">Autonomer Fire State</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-stone-50">5-Minuten-Fire fuer den lokalen Arbeitsblock</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            KosmoOrbit speichert hier den heutigen autonomen Arbeitsmodus: Uhrzeit pruefen, alle 5 Minuten einen
            Fire-Stand halten, Addon Memory und eigene Worker Memory sichern, aber keine echten Timer, Prozesse,
            Runtime-Writes oder externen Aktionen starten.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ['Worker', autonomousFireState.loop_goal.worker],
              ['Datum', `${autonomousFireState.date_local} / ${autonomousFireState.timezone}`],
              ['Aktueller Fire', `${autonomousFireState.current_fire.local_time} / ${autonomousFireState.current_fire.state}`],
              ['Intervall', `${autonomousFireState.loop_goal.fire_interval_minutes} Minuten`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{label}</p>
                <p className="mt-1 text-sm font-semibold text-stone-100">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md border border-violet-200/15 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-200">Fokus</p>
            <p className="mt-1 text-sm leading-6 text-stone-300">{autonomousFireState.loop_goal.focus}</p>
            <p className="mt-2 text-xs leading-5 text-stone-500">{autonomousFireState.current_fire.last_confirmed_safe_scope}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-md border border-emerald-200/15 bg-emerald-300/[0.055] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Autonom erlaubt</p>
            <div className="mt-3">
              <ChipList items={autonomousFireState.autonomous_permissions.allowed_without_question} tone="green" />
            </div>
          </div>
          <div className="rounded-md border border-rose-200/15 bg-rose-400/[0.06] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Nur mit explizitem Go</p>
            <div className="mt-3">
              <ChipList items={autonomousFireState.autonomous_permissions.ask_or_explicit_go_required} tone="red" />
            </div>
            <p className="mt-3 text-xs leading-5 text-rose-100/75">
              Safety: kein Push, kein Deploy, keine externen Accounts, keine Runtime-Writes, keine Uploads und keine Kostenjobs.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100">Addon Memory</p>
          <div className="mt-3 space-y-3">
            {autonomousFireState.addon_memory.map((entry) => (
              <div key={entry.id} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-semibold text-stone-100">{entry.id.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-violet-200">{entry.status}</p>
                <p className="mt-2 text-xs leading-5 text-stone-400">{entry.memory}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">Eigene Worker Memory</p>
          <ul className="mt-3 space-y-2">
            {autonomousFireState.own_memory.map((item) => (
              <li key={item} className="rounded-md border border-cyan-200/10 bg-cyan-300/[0.04] p-2 text-xs leading-5 text-stone-300">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">Naechster sicherer Fire</p>
          <ul className="mt-3 space-y-2">
            {autonomousFireState.next_safe_actions.map((item) => (
              <li key={item} className="rounded-md border border-amber-200/10 bg-amber-300/[0.045] p-2 text-xs leading-5 text-stone-300">
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Heute blockiert</p>
            <div className="mt-2">
              <ChipList items={autonomousFireState.blocked_today} tone="yellow" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
