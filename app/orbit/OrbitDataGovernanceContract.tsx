import dataGovernanceContractData from '@/examples/kosmo-orbit/governance/orbit-data-governance.contract.json';

type DataDomain = {
  id: string;
  label: string;
  future_storage_scope: string[];
  today_preview_scope: string[];
  retention_gate: string;
  backup_gate: string;
  blocked_today: string[];
};

type StorageLane = {
  id: string;
  today: string;
  future_requirement: string;
  blocked_today: string[];
};

type DataGovernanceContract = {
  status: string;
  mode: string;
  governance_principles: string[];
  data_domains: DataDomain[];
  storage_lanes: StorageLane[];
  blocked_capabilities: string[];
  promotion_requirements: string[];
};

const dataGovernanceContract = dataGovernanceContractData as DataGovernanceContract;

function pretty(value: string) {
  return value.replace(/_/g, ' ');
}

export function OrbitDataGovernanceContract() {
  return (
    <section className="rounded-lg border border-emerald-200/20 bg-black/30 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Data Governance Boundary</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Welche lokalen Daten KosmoOrbit spaeter speichern darf</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
            Nach Rollen, Arbeitsstationen und Identity braucht KosmoOrbit eine Daten-Grenze: Projektwissen,
            Assets/Rechte, Profile, Sessions, Audit, Entscheide und Lernnotizen duerfen erst persistieren, wenn
            Retention, Backup, Delete/Export, Datenschutz und Owner-Gates geklaert sind. Heute bleibt alles
            statisch: keine D1-Writes, keine R2-Uploads, keine Kundendaten-Writes, kein Backup-Job und kein externer Sync.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-100">
            {dataGovernanceContract.status}
          </span>
          <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-100">
            {dataGovernanceContract.mode}
          </span>
          <span className="rounded-full border border-rose-300/35 bg-rose-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-rose-100">
            {dataGovernanceContract.blocked_capabilities.length} blocked
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Prinzipien</p>
          <div className="mt-3 grid gap-2">
            {dataGovernanceContract.governance_principles.map((principle) => (
              <p key={principle} className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm leading-5 text-emerald-50/90">
                {principle}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-100">Heute blockiert</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dataGovernanceContract.blocked_capabilities.map((capability) => (
              <span key={capability} className="rounded-full border border-rose-300/30 bg-black/24 px-2.5 py-1 font-mono text-[11px] text-rose-50/90">
                {capability}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-5">
        {dataGovernanceContract.data_domains.map((domain) => (
          <article key={domain.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{pretty(domain.id)}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{domain.label}</h3>
            <div className="mt-3 grid gap-2">
              <div className="rounded-md border border-cyan-300/20 bg-cyan-300/10 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100">Heute Preview</p>
                <ul className="mt-1 space-y-1 text-sm leading-5 text-cyan-50/85">
                  {domain.today_preview_scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-white/10 bg-black/24 p-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Spaeter Speicher</p>
                <ul className="mt-1 space-y-1 text-sm leading-5 text-stone-300">
                  {domain.future_storage_scope.map((item) => (
                    <li key={item}>{pretty(item)}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm leading-5 text-amber-100">
              Retention: {domain.retention_gate}
            </p>
            <p className="mt-2 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm leading-5 text-emerald-100">
              Backup: {domain.backup_gate}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {domain.blocked_today.map((item) => (
                <span key={item} className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 font-mono text-[11px] text-rose-100">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {dataGovernanceContract.storage_lanes.map((lane) => (
          <article key={lane.id} className="rounded-lg border border-white/10 bg-black/24 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{pretty(lane.id)}</p>
            <p className="mt-2 text-sm leading-5 text-stone-200">{lane.today}</p>
            <p className="mt-2 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm leading-5 text-cyan-100">
              {lane.future_requirement}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lane.blocked_today.map((item) => (
                <span key={item} className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 font-mono text-[11px] text-rose-100">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-100">Promotion Requirements</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {dataGovernanceContract.promotion_requirements.map((requirement) => (
            <p key={requirement} className="rounded-md bg-black/24 px-3 py-2 text-sm leading-5 text-stone-200">
              {requirement}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
