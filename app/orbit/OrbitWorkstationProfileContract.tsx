import workstationProfileContractData from '@/examples/kosmo-orbit/workstations/orbit-workstation-profile.contract.json';

type WorkstationProfile = {
  id: string;
  role_id: string;
  label: string;
  station_type: string;
  startup_surface: string;
  interface_depth: string;
  primary_focus: string;
  visible_modules: string[];
  safe_actions: string[];
  blocked_actions: string[];
  human_gate: string;
};

type WorkstationProfileContract = {
  status: string;
  mode: string;
  global_policy: Record<string, boolean>;
  profiles: WorkstationProfile[];
  escalation_rules: string[];
};

const workstationProfileContract = workstationProfileContractData as WorkstationProfileContract;

function pretty(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitWorkstationProfileContract() {
  const blockedPolicyCount = Object.entries(workstationProfileContract.global_policy).filter(
    ([key, value]) => key.startsWith('no_') && value
  ).length;

  return (
    <section className="rounded-lg border border-cyan-200/20 bg-black/30 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Workstation Profile Contract</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Wie KosmoOrbit je Arbeitsplatz startet</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Dieser Vertrag zeigt, wie dieselbe installierte Hauptsoftware spaeter je Rolle anders oeffnet:
            Chef sieht Entscheidungen, IT/KI sieht Runtime-Evidenz, Projektleitung sieht Gates, Entwurf sieht
            KosmoDesign Review, Zeichnung sieht Modellqualitaet und Ausbildung sieht Lernmodus. Heute bleibt alles
            statisch: keine Accounts, keine User-Writes, keine Persistenz und keine echte Auth-Runtime.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-100">
            {workstationProfileContract.status}
          </span>
          <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-100">
            {workstationProfileContract.mode}
          </span>
          <span className="rounded-full border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-100">
            {blockedPolicyCount} safety locks
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {workstationProfileContract.profiles.map((profile) => (
          <article key={profile.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{pretty(profile.station_type)}</p>
                <h3 className="mt-1 text-base font-semibold text-white">{profile.label}</h3>
              </div>
              <span className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-100">
                {pretty(profile.interface_depth)}
              </span>
            </div>

            <p className="mt-3 text-sm leading-5 text-stone-300">{profile.primary_focus}</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-white/10 bg-black/24 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Startoberflaeche</p>
                <p className="mt-2 text-sm leading-5 text-cyan-100">{pretty(profile.startup_surface)}</p>
              </div>
              <div className="rounded-md border border-white/10 bg-black/24 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Human Gate</p>
                <p className="mt-2 text-sm leading-5 text-amber-100">{profile.human_gate}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Module</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.visible_modules.map((module) => (
                  <span key={module} className="rounded-full border border-sky-300/30 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-100">
                    {module}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">Sichere Aktionen</p>
                <ul className="mt-2 space-y-1 text-sm leading-5 text-emerald-50/85">
                  {profile.safe_actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-rose-300/20 bg-rose-400/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Blockiert</p>
                <ul className="mt-2 space-y-1 font-mono text-xs leading-5 text-rose-50/85">
                  {profile.blocked_actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Eskalationsregeln</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {workstationProfileContract.escalation_rules.map((rule) => (
            <p key={rule} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-stone-200">
              {rule}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
