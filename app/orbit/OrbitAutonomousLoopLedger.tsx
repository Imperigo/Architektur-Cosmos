import loopLedgerData from '@/examples/kosmo-orbit/memory/orbit-autonomous-loop-ledger.contract.json';

type FireRecord = {
  id: string;
  local_time: string;
  record: string;
  primary_delta: string;
  checks: string[];
};

type LoopLedger = {
  status: string;
  date_local: string;
  timezone: string;
  loop_boundary: {
    objective: string;
    fire_interval_minutes: number;
    stop_after_local_time: string;
  };
  fire_records: FireRecord[];
  current_green_state: Record<string, string>;
  memory_added_today: string[];
  still_blocked: string[];
  next_safe_actions: string[];
};

const ledger = loopLedgerData as LoopLedger;

function Token({ children, tone = 'neutral' }: { children: string; tone?: 'green' | 'red' | 'blue' | 'neutral' }) {
  const toneClass = {
    green: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
    red: 'border-rose-300/30 bg-rose-400/10 text-rose-100',
    blue: 'border-sky-300/30 bg-sky-400/10 text-sky-100',
    neutral: 'border-white/10 bg-white/[0.04] text-stone-200'
  }[tone];

  return <span className={`rounded-full border px-2.5 py-1 text-xs leading-tight ${toneClass}`}>{children}</span>;
}

export function OrbitAutonomousLoopLedger() {
  return (
    <section className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.045] p-4 shadow-[0_18px_70px_rgba(8,145,178,0.13)] lg:p-5">
      <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Autonomous Loop Ledger</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-stone-50">Gesamtzusammenfassung des 5-Minuten Loop bis 24:00</h2>
          <p className="mt-3 text-sm leading-6 text-stone-300">
            Dieser Ledger sammelt die Fire-Records des heutigen autonomen Blocks bis {ledger.loop_boundary.stop_after_local_time}
            {' '}Zuerich Zeit. Er zeigt, was neu gespeichert wurde, welche Checks gruen sind und welche Grenzen weiter
            blockiert bleiben.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-cyan-200/15 bg-cyan-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">Fires</p>
              <p className="mt-1 font-mono text-lg text-cyan-100">{ledger.fire_records.length}</p>
            </div>
            <div className="rounded-md border border-emerald-200/15 bg-emerald-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">Full Review</p>
              <p className="mt-1 font-mono text-lg text-emerald-100">{ledger.current_green_state.full_review}</p>
            </div>
            <div className="rounded-md border border-rose-200/15 bg-rose-300/[0.06] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">Blockiert</p>
              <p className="mt-1 font-mono text-lg text-rose-100">{ledger.still_blocked.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">Fire Timeline</p>
          <div className="mt-3 grid gap-3">
            {ledger.fire_records.map((record) => (
              <article key={record.id} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-100">{record.local_time}</h3>
                  <Token tone="blue">{record.id}</Token>
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-400">{record.primary_delta}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {record.checks.map((check) => (
                    <Token key={check} tone="green">
                      {check}
                    </Token>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Gruenstand</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(ledger.current_green_state).map(([key, value]) => (
              <Token key={key} tone="green">
                {key.replaceAll('_', ' ')} {value}
              </Token>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100">Memory Added</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ledger.memory_added_today.map((item) => (
              <Token key={item} tone="blue">
                {item.replaceAll('_', ' ')}
              </Token>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-black/18 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Weiter blockiert</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ledger.still_blocked.map((item) => (
              <Token key={item} tone="red">
                {item.replaceAll('_', ' ')}
              </Token>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
