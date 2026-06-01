import healthReadinessContractData from '@/examples/kosmo-orbit/health/health-readiness.contract.json';

type HealthChannel = {
  id: string;
  label: string;
  today: string;
  later: string;
  guard: string;
};

type HealthReadinessContract = {
  status: string;
  mode: string;
  channels: HealthChannel[];
};

const healthReadinessContract = healthReadinessContractData as HealthReadinessContract;

export function OrbitHealthReadiness() {
  return (
    <section className="rounded-lg border border-sky-300/20 bg-sky-300/[0.045] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100">Health Readiness</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Welche lokalen Signale KosmoOrbit spaeter lesen soll</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Diese Schicht bereitet die spaetere KosmoZentrale-Diagnose vor. Heute liest sie keine echten Sensoren,
            startet keine Dienste und scannt kein Dateisystem. Sie macht nur sichtbar, welche Health-Kanaele die
            lokale Appliance spaeter braucht. Quelle ist ein lokaler JSON-Vertrag, kein Runtime-Sensor.
          </p>
        </div>
        <span className="inline-flex max-w-full items-center break-words rounded-full border border-sky-300/35 bg-sky-400/10 px-2.5 py-1 text-[11px] font-medium leading-tight text-sky-100">
          read-only-telemetry-contract
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {healthReadinessContract.channels.map((channel) => (
          <article key={channel.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="break-words text-base font-semibold text-white">{channel.label}</h3>
              <span className="inline-flex max-w-full items-center break-words rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-stone-300">
                {channel.id}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-5">
              <p className="rounded-md border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-sky-100">
                Heute: {channel.today}
              </p>
              <p className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-stone-300">
                Spaeter: {channel.later}
              </p>
              <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                Guard: {channel.guard}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
