import officeRoutineData from '@/examples/kosmo-orbit/routines/orbit-office-routine.contract.json';

type Routine = {
  id: string;
  phase: string;
  owner_role: string;
  title: string;
  intent: string;
  allowed_signals: string[];
  output: string;
  writes_user_data: boolean;
  requires_human_confirmation: boolean;
};

type OfficeRoutineContract = {
  mode: string;
  routines: Routine[];
  blocked_actions: string[];
};

const officeRoutine = officeRoutineData as OfficeRoutineContract;

const phaseTone: Record<string, string> = {
  morning: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
  workday: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  training: 'border-indigo-300/35 bg-indigo-400/10 text-indigo-100',
  evening: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
  safety: 'border-rose-300/35 bg-rose-400/10 text-rose-100'
};

function formatId(value: string) {
  return value.replace(/_/g, ' ').replace(/-/g, ' ');
}

export function OrbitOfficeRoutine() {
  const blockedActions = officeRoutine.blocked_actions.slice(0, 9);

  return (
    <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Buero-Routine</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie KosmoOrbit einen Arbeitstag fuehren soll</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Routine ist der statische Vertrag fuer den spaeteren lokalen Tagesrhythmus: morgens pruefen,
            tagsueber Blocker und Review-Kontext fuehren, Lernende sicher begleiten und abends sauber abschliessen.
            Heute startet sie keine Modelle, Tools, Uploads oder echten Automationen.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-emerald-100">
          {formatId(officeRoutine.mode)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {officeRoutine.routines.map((routine) => (
          <article key={routine.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{formatId(routine.owner_role)}</p>
                <h3 className="mt-2 break-words text-base font-semibold text-white">{routine.title}</h3>
              </div>
              <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${phaseTone[routine.phase] ?? phaseTone.workday}`}>
                {routine.phase}
              </span>
            </div>
            <p className="mt-3 text-sm leading-5 text-stone-300">{routine.intent}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex max-w-full items-center break-words rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] text-stone-100">
                output: {formatId(routine.output)}
              </span>
              <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] ${routine.requires_human_confirmation ? 'border-amber-300/35 bg-amber-400/10 text-amber-100' : 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100'}`}>
                {routine.requires_human_confirmation ? 'human confirmation' : 'read-only learning'}
              </span>
              <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] ${routine.writes_user_data ? 'border-rose-300/35 bg-rose-400/10 text-rose-100' : 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100'}`}>
                writes user data: {routine.writes_user_data ? 'yes' : 'no'}
              </span>
            </div>
            <div className="mt-3 grid gap-1.5">
              {routine.allowed_signals.slice(0, 4).map((signal) => (
                <p key={signal} className="rounded-md bg-white/[0.04] px-3 py-1.5 text-xs text-stone-400">{formatId(signal)}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-rose-300/25 bg-rose-400/10 p-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Immer blockiert ohne Freigabe</p>
            <h3 className="mt-2 text-base font-semibold text-white">Keine versteckte Vollautomation</h3>
          </div>
          <span className="inline-flex max-w-full items-center break-words rounded-full border border-rose-300/35 bg-black/20 px-2.5 py-1 text-[11px] text-rose-100">
            {blockedActions.length} hard stops
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {blockedActions.map((action) => (
            <p key={action} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-rose-100">{formatId(action)}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
