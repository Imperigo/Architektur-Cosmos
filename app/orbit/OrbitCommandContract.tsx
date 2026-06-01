import commandContractData from '@/examples/kosmo-orbit/commands/orbit-command.contract.json';

type CommandState = 'blocked' | 'local_check' | 'review_enabled';

type OrbitCommand = {
  id: string;
  label: string;
  area: string;
  state: CommandState;
  role: string;
  today: string;
  gate: string;
};

type CommandContract = {
  mode: string;
  commands: OrbitCommand[];
};

const commandContract = commandContractData as CommandContract;

const stateTone: Record<CommandState, string> = {
  blocked: 'border-rose-300/35 bg-rose-400/10 text-rose-100',
  local_check: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
  review_enabled: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100'
};

export function OrbitCommandContract() {
  return (
    <section className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-100">Command-Vertrag</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Welche Aktionen KosmoOrbit spaeter steuern darf</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieser Vertrag trennt sichere Review-Kommandos von gesperrten Runtime-Kommandos. Heute darf KosmoOrbit
            Projektpakete zeigen, Review Mode erklaeren und lokale Checks auswerten. Tool-Launch, Design-Generation,
            Writes, Publishing, Reparatur und externer Sync bleiben blockiert.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-fuchsia-300/35 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-fuchsia-100">
          static-command-contract
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {commandContract.commands.map((command) => (
          <article key={command.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-white">{command.label}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">{command.area} / {command.role}</p>
              </div>
              <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${stateTone[command.state]}`}>
                {command.state}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-5">
              <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
                Heute: {command.today}
              </p>
              <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                Gate: {command.gate}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
