import workspaceData from '@/examples/kosmo-orbit/workspace.demo.json';

type ToolStatus = 'active' | 'prototype' | 'planned' | 'external' | 'blocked';
type GateStatus = 'ready' | 'needs_review' | 'blocked' | 'local_only' | 'approved_local' | 'approved_public' | 'unknown';

type OrbitRole = {
  id: string;
  label: string;
  level: string;
  ui_mode: string;
  description: string;
};

type OrbitTool = {
  id: string;
  name: string;
  category: string;
  status: ToolStatus;
  primary_roles: string[];
  gates: string[];
  description: string;
  handoff_target?: string;
};

type OrbitGate = {
  id: string;
  type: string;
  status: GateStatus;
  owner_role: string;
  tool_id: string;
  description: string;
};

type OrbitWorkspace = {
  workspace: {
    name: string;
    mode: string;
    hardware_profile: string;
  };
  roles: OrbitRole[];
  tools: OrbitTool[];
  gates: OrbitGate[];
};

const workspace = workspaceData as OrbitWorkspace;

const statusTone: Record<ToolStatus, string> = {
  active: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100',
  prototype: 'border-sky-300/40 bg-sky-400/10 text-sky-100',
  planned: 'border-white/15 bg-white/[0.06] text-stone-200',
  external: 'border-violet-300/40 bg-violet-400/10 text-violet-100',
  blocked: 'border-rose-300/40 bg-rose-400/10 text-rose-100'
};

const gateTone: Record<GateStatus, string> = {
  ready: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  approved_local: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  needs_review: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
  unknown: 'border-stone-300/25 bg-white/[0.06] text-stone-200',
  local_only: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
  blocked: 'border-rose-300/40 bg-rose-400/10 text-rose-100',
  approved_public: 'border-fuchsia-300/35 bg-fuchsia-400/10 text-fuchsia-100'
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex max-w-full items-center break-words rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] leading-tight ${className}`}>
      {label}
    </span>
  );
}

function roleLabel(roleId: string) {
  return workspace.roles.find((role) => role.id === roleId)?.label ?? roleId.replace(/_/g, ' ');
}

function gatesForTool(toolId: string) {
  return workspace.gates.filter((gate) => gate.tool_id === toolId);
}

export function OrbitToolRegistry() {
  const activeTools = workspace.tools.filter((tool) => tool.status === 'active' || tool.status === 'prototype').length;
  const blockedOrReviewGates = workspace.gates.filter((gate) => gate.status === 'blocked' || gate.status === 'needs_review').length;

  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.04] p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Tool-Orchestrierung</p>
          <h2 className="mt-2 text-xl font-semibold text-white">KosmoOrbit als Software-Zentrale aller Architektur-Tools</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-300">
            Dieses Register zeigt, welche Teile der Architektur-Kosmos-Software KosmoOrbit spaeter lokal steuert.
            Heute ist es ein statischer, lesender Vertrag: Tools werden sichtbar, Rollen werden zugeordnet und
            Gates bleiben blockiert oder review-pflichtig, bevor Kosmo echte Runtime-Aktionen ausloesen darf.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge label={`${workspace.tools.length} tools`} className="border-cyan-300/35 bg-cyan-400/10 text-cyan-100" />
          <Badge label={`${activeTools} aktiv/prototyp`} className="border-emerald-300/35 bg-emerald-400/10 text-emerald-100" />
          <Badge label={`${blockedOrReviewGates} gates offen`} className="border-amber-300/35 bg-amber-400/10 text-amber-100" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[0.75fr_1.25fr]">
        <aside className="rounded-lg border border-white/10 bg-black/28 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Workspace Contract</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              <dt className="text-xs text-stone-500">Betrieb</dt>
              <dd className="mt-1 break-words text-stone-200">{workspace.workspace.name}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              <dt className="text-xs text-stone-500">Modus</dt>
              <dd className="mt-1 font-mono text-cyan-100">{workspace.workspace.mode}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2">
              <dt className="text-xs text-stone-500">Hardware</dt>
              <dd className="mt-1 font-mono text-stone-200">{workspace.workspace.hardware_profile}</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-md border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-100">
            Keine Tool-Launches, keine Modellstarts, keine Uploads, keine Kostenjobs, keine Public-Freigabe.
          </p>
        </aside>

        <div className="grid gap-3 md:grid-cols-2">
          {workspace.tools.map((tool) => {
            const gates = gatesForTool(tool.id);
            return (
              <article key={tool.id} className="min-w-0 rounded-lg border border-white/10 bg-black/24 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold text-white">{tool.name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">{tool.category}</p>
                  </div>
                  <Badge label={tool.status} className={statusTone[tool.status]} />
                </div>
                <p className="mt-3 text-sm leading-5 text-stone-300">{tool.description}</p>
                {tool.handoff_target ? (
                  <p className="mt-2 rounded-md border border-violet-300/20 bg-violet-400/10 px-3 py-2 text-xs leading-5 text-violet-100">
                    Handoff: {tool.handoff_target}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tool.primary_roles.slice(0, 4).map((roleId) => (
                    <span key={roleId} className="inline-flex max-w-full items-center break-words rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium leading-tight text-stone-300">
                      {roleLabel(roleId)}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid gap-1.5">
                  {gates.map((gate) => (
                    <div key={gate.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-2">
                      <span className="text-xs text-stone-300">{gate.id}</span>
                      <Badge label={gate.status} className={gateTone[gate.status]} />
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
